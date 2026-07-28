package fr.vandriessche.rallyeschema.responseservice.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.mock.web.MockMultipartFile;

import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.MongoIterable;

@ExtendWith(MockitoExtension.class)
class DatabaseMaintenanceServiceTests {

	@InjectMocks
	private DatabaseMaintenanceService databaseMaintenanceService;

	@Mock
	private MongoTemplate mongoTemplate;

	@Test
	void invalidBackupDoesNotAccessOrEraseDatabase() {
		MockMultipartFile invalidFile = new MockMultipartFile(
				"file", "invalid.zip", "application/zip", "not a zip".getBytes());

		assertThrows(IOException.class, () -> databaseMaintenanceService.restoreFromBackup(invalidFile));

		verifyNoInteractions(mongoTemplate);
	}

	@Test
	@SuppressWarnings("unchecked")
	void backupPreservesRichFormDesignContent() throws Exception {
		MongoDatabase database = mock(MongoDatabase.class);
		MongoIterable<String> collectionNames = mock(MongoIterable.class);
		MongoCursor<String> collectionNamesCursor = mock(MongoCursor.class);
		MongoCollection<Document> emptyCollection = mock(MongoCollection.class);
		MongoCollection<Document> formDesignCollection = mock(MongoCollection.class);
		FindIterable<Document> emptyFind = mock(FindIterable.class);
		FindIterable<Document> formDesignFind = mock(FindIterable.class);
		MongoCursor<Document> emptyCursor = mock(MongoCursor.class);
		MongoCursor<Document> formDesignCursor = mock(MongoCursor.class);

		when(mongoTemplate.getDb()).thenReturn(database);
		when(database.listCollectionNames()).thenReturn(collectionNames);
		when(collectionNames.iterator()).thenReturn(collectionNamesCursor);
		when(collectionNamesCursor.hasNext()).thenReturn(false);
		when(database.getCollection(anyString())).thenAnswer(invocation ->
				"formDesign".equals(invocation.getArgument(0)) ? formDesignCollection : emptyCollection);
		when(emptyCollection.find()).thenReturn(emptyFind);
		when(emptyFind.iterator()).thenReturn(emptyCursor);
		when(emptyCursor.hasNext()).thenReturn(false);
		when(formDesignCollection.find()).thenReturn(formDesignFind);
		when(formDesignFind.iterator()).thenReturn(formDesignCursor);

		String richAnswer = "<b>Texte</b> ⭐ <img class=\"media-inline\" width=\"42\" height=\"21\" "
				+ "src=\"data:image/png;base64,iVBORw0KGgo=\" alt=\"exemple\">";
		Document design = new Document("_id", "stage-id")
				.append("stageParamId", "stage-id")
				.append("schemaVersion", 8)
				.append("content", new Document("sections", List.of(
						new Document("title", "Section")
								.append("questions", List.of(
										new Document("number", "D").append("answer", richAnswer))))));
		when(formDesignCursor.hasNext()).thenReturn(true, false);
		when(formDesignCursor.next()).thenReturn(design);

		ByteArrayOutputStream output = new ByteArrayOutputStream();
		databaseMaintenanceService.writeBackup(output);

		Document restored = readCollectionDocument(output.toByteArray(), "formDesign.json");
		assertNotNull(restored);
		assertEquals(8, restored.getInteger("schemaVersion"));
		Document content = restored.get("content", Document.class);
		List<?> sections = content.getList("sections", Object.class);
		Document section = (Document) sections.get(0);
		List<?> questions = section.getList("questions", Object.class);
		Document question = (Document) questions.get(0);
		assertEquals(richAnswer, question.getString("answer"));
	}

	private Document readCollectionDocument(byte[] archive, String expectedEntry) throws IOException {
		try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive),
				StandardCharsets.UTF_8)) {
			ZipEntry entry;
			while ((entry = zip.getNextEntry()) != null) {
				if (expectedEntry.equals(entry.getName())) {
					return Document.parse(new String(zip.readAllBytes(), StandardCharsets.UTF_8));
				}
			}
		}
		return null;
	}
}
