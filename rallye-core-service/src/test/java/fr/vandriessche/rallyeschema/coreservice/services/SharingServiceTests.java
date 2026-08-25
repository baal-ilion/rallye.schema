package fr.vandriessche.rallyeschema.coreservice.services;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import fr.vandriessche.rallyeschema.coreservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.coreservice.entities.RallyConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormDesignRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.RallyConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormReferenceImageRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormRecognitionConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeGroupRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamRepository;

@ExtendWith(MockitoExtension.class)
class SharingServiceTests {
	@InjectMocks
	private SharingService sharingService;

	@Spy
	private ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
	@Mock
	private TeamService teamService;
	@Mock
	private ChallengeConfigurationService challengeConfigurationService;
	@Mock
	private FormRecognitionConfigurationService formRecognitionConfigurationService;
	@Mock
	private TeamRepository teamRepository;
	@Mock
	private ChallengeConfigurationRepository challengeConfigurationRepository;
	@Mock
	private ChallengeGroupRepository challengeGroupRepository;
	@Mock
	private FormRecognitionConfigurationRepository formRecognitionConfigurationRepository;
	@Mock
	private FormReferenceImageRepository formReferenceImageRepository;
	@Mock
	private FormDesignRepository formDesignRepository;
	@Mock
	private RallyConfigurationRepository rallyConfigurationRepository;

	@Test
	void exportIncludesRallyAndEditableFormDesigns() throws Exception {
		RallyConfiguration rally = new RallyConfiguration();
		rally.setTitle("Rallye test");
		FormDesign design = new FormDesign();
		design.setId("challenge-id");
		design.setChallengeConfigurationId("challenge-id");
		design.setUpdatedAt(Instant.parse("2026-07-23T20:00:00Z"));

		when(rallyConfigurationRepository.findById(RallyConfiguration.SINGLETON_ID)).thenReturn(Optional.of(rally));
		when(formDesignRepository.findAll()).thenReturn(java.util.List.of(design));
		when(teamService.getTeams()).thenReturn(java.util.List.of());
		when(challengeGroupRepository.findAll()).thenReturn(java.util.List.of());
		when(challengeConfigurationService.getChallengeConfigurations()).thenReturn(java.util.List.of());
		when(formRecognitionConfigurationService.getReferenceFormRecognitionConfiguration()).thenReturn(Optional.empty());

		ByteArrayOutputStream output = new ByteArrayOutputStream();
		sharingService.exportConfigurationArchive(output);

		Set<String> entries = zipEntries(output.toByteArray());
		assertTrue(entries.contains("rally/configuration.json"));
		assertTrue(entries.contains("formDesign/formDesign-challenge-id.json"));
	}

	@Test
	void importRestoresChallengeIdsBeforeFormDesigns() throws Exception {
		RallyConfiguration rally = new RallyConfiguration();
		rally.setTitle("Rallye restauré");
		ChallengeConfiguration challenge = new ChallengeConfiguration(83);
		challenge.setId("challenge-id");
		challenge.setVersion(12L);
		challenge.setName("Épreuve restaurée");
		FormDesign design = new FormDesign();
		design.setId("challenge-id");
		design.setVersion(4L);
		design.setChallengeConfigurationId("challenge-id");
		design.setSchemaVersion(7);
		design.setContent(new java.util.LinkedHashMap<>(java.util.Map.of(
				"sections", java.util.List.of(java.util.Map.of(
						"verticalTitle", true,
						"numberMediaWidthMm", 8,
						"answer", "Texte <img src=\"data:image/png;base64,AA==\">")),
				"font", "Pirata One")));

		byte[] archive = archive(rally, challenge, design);
		MockMultipartFile file = new MockMultipartFile("file", "configuration.zip",
				"application/zip", archive);

		sharingService.importConfigurationArchive(file);

		verify(challengeConfigurationRepository).insert(any(ChallengeConfiguration.class));
		ArgumentCaptor<FormDesign> restoredDesign = ArgumentCaptor.forClass(FormDesign.class);
		verify(formDesignRepository).insert(restoredDesign.capture());
		assertEquals(7, restoredDesign.getValue().getSchemaVersion());
		assertEquals(design.getContent(), restoredDesign.getValue().getContent());
		verify(rallyConfigurationRepository).insert(any(RallyConfiguration.class));
	}

	@Test
	void invalidArchiveDoesNotDeleteCurrentConfiguration() throws Exception {
		FormRecognitionConfiguration submittedForm = new FormRecognitionConfiguration();
		submittedForm.setChallenge(83);
		submittedForm.setPage(1);
		ByteArrayOutputStream output = new ByteArrayOutputStream();
		try (ZipOutputStream zip = new ZipOutputStream(output)) {
			write(zip, "challengeConfiguration/challengeConfiguration-83/submittedForm-83-1/submittedForm-83-1.json",
					submittedForm);
		}
		MockMultipartFile file = new MockMultipartFile("file", "configuration-incomplete.zip",
				"application/zip", output.toByteArray());

		org.junit.jupiter.api.Assertions.assertThrows(IOException.class,
				() -> sharingService.importConfigurationArchive(file));

		verify(challengeConfigurationRepository, never()).deleteAll();
		verify(formDesignRepository, never()).deleteAll();
	}

	private byte[] archive(RallyConfiguration rally, ChallengeConfiguration challenge, FormDesign design) throws Exception {
		ByteArrayOutputStream output = new ByteArrayOutputStream();
		try (ZipOutputStream zip = new ZipOutputStream(output)) {
			write(zip, "rally/configuration.json", rally);
			write(zip, "challengeConfiguration/challengeConfiguration-83/challengeConfiguration-83.json", challenge);
			write(zip, "formDesign/formDesign-challenge-id.json", design);
		}
		return output.toByteArray();
	}

	private void write(ZipOutputStream zip, String name, Object value) throws Exception {
		zip.putNextEntry(new ZipEntry(name));
		zip.write(objectMapper.writeValueAsBytes(value));
		zip.closeEntry();
	}

	private Set<String> zipEntries(byte[] archive) throws Exception {
		Set<String> entries = new HashSet<>();
		try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive))) {
			ZipEntry entry;
			while ((entry = zip.getNextEntry()) != null) {
				entries.add(entry.getName());
			}
		}
		return entries;
	}
}
