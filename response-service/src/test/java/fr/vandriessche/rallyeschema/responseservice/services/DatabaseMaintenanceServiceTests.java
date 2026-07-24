package fr.vandriessche.rallyeschema.responseservice.services;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

import java.io.IOException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.mock.web.MockMultipartFile;

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
}
