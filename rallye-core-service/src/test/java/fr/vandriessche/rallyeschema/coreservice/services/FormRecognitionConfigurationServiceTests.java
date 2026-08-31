package fr.vandriessche.rallyeschema.coreservice.services;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.bson.BsonBinarySubType;
import org.bson.types.Binary;

import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.FormReferenceImage;
import fr.vandriessche.rallyeschema.coreservice.models.GeneratedFormRecognitionConfigurationRequest;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormReferenceImageRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormRecognitionConfigurationRepository;

@ExtendWith(MockitoExtension.class)
class FormRecognitionConfigurationServiceTests {
	@Mock
	private FormRecognitionConfigurationRepository formRecognitionConfigurationRepository;
	@Mock
	private FormReferenceImageRepository formReferenceImageRepository;
	@Mock
	private ChallengeConfigurationService challengeConfigurationService;
	@InjectMocks
	private FormRecognitionConfigurationService service;

	@Test
	void generatedPublicationCannotReplaceAnExternallyConfiguredPage() {
		FormRecognitionConfiguration imported = configuration("imported", 25, 1, false);
		FormRecognitionConfiguration generated = configuration(null, 25, 1, false);
		GeneratedFormRecognitionConfigurationRequest page = new GeneratedFormRecognitionConfigurationRequest();
		page.setConfiguration(generated);

		when(formRecognitionConfigurationRepository.findByChallenge(25)).thenReturn(List.of(imported));
		when(formRecognitionConfigurationRepository.findByChallengeAndPage(25, 1)).thenReturn(Optional.of(imported));

		assertThrows(IllegalStateException.class,
				() -> service.replaceGeneratedChallengeFormRecognitionConfigurations(25, List.of(page)));
		verify(formRecognitionConfigurationRepository, never()).save(any());
		verify(formRecognitionConfigurationRepository, never()).deleteById(any());
	}

	@Test
	void generatedPublicationOnlyDeletesObsoleteDesignerPages() throws Exception {
		FormRecognitionConfiguration imported = configuration("imported", 25, 1, false);
		FormRecognitionConfiguration designer = configuration("designer", 25, 2, true);

		when(formRecognitionConfigurationRepository.findByChallenge(25)).thenReturn(List.of(imported, designer));
		when(formRecognitionConfigurationRepository.findById("designer")).thenReturn(Optional.of(designer));

		service.replaceGeneratedChallengeFormRecognitionConfigurations(25, List.of());

		verify(formRecognitionConfigurationRepository).deleteById("designer");
		verify(formRecognitionConfigurationRepository, never()).deleteById("imported");
	}

	@Test
	void designerDeletionPreservesExternallyConfiguredPages() {
		FormRecognitionConfiguration imported = configuration("imported", 25, 1, false);
		FormRecognitionConfiguration designer = configuration("designer", 25, 2, true);

		when(formRecognitionConfigurationRepository.findByChallenge(25)).thenReturn(List.of(imported, designer));
		when(formRecognitionConfigurationRepository.findById("designer")).thenReturn(Optional.of(designer));

		service.deleteFormRecognitionConfigurationsByChallenge(25);

		verify(formRecognitionConfigurationRepository).deleteById("designer");
		verify(formRecognitionConfigurationRepository, never()).deleteById("imported");
	}

	@Test
	void referenceFormAlwaysBelongsToTheDesigner() throws Exception {
		FormRecognitionConfiguration reference = new FormRecognitionConfiguration();
		FormReferenceImage image = new FormReferenceImage();
		image.setFile(new Binary(BsonBinarySubType.BINARY, Base64.getDecoder().decode(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")));
		when(formRecognitionConfigurationRepository.save(any())).thenAnswer(invocation -> {
			FormRecognitionConfiguration saved = invocation.getArgument(0);
			saved.setId("reference");
			return saved;
		});

		FormRecognitionConfiguration saved = service.addReferenceFormRecognitionConfiguration(reference, image);

		org.junit.jupiter.api.Assertions.assertTrue(saved.isDesignerManaged());
	}

	private FormRecognitionConfiguration configuration(String id, int challenge, int page, boolean designerManaged) {
		FormRecognitionConfiguration configuration = new FormRecognitionConfiguration();
		configuration.setId(id);
		configuration.setChallenge(challenge);
		configuration.setPage(page);
		configuration.setDesignerManaged(designerManaged);
		return configuration;
	}
}
