package fr.vandriessche.rallyeschema.responseservice.services;

import static org.junit.jupiter.api.Assertions.assertTrue;
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
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import fr.vandriessche.rallyeschema.responseservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.responseservice.entities.RallyParam;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.repositories.FormDesignRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.RallyParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileModelRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageGroupRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamInfoRepository;

@ExtendWith(MockitoExtension.class)
class SharingServiceTests {
	@InjectMocks
	private SharingService sharingService;

	@Spy
	private ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
	@Mock
	private TeamInfoService teamInfoService;
	@Mock
	private StageParamService stageParamService;
	@Mock
	private ResponseFileParamService responseFileParamService;
	@Mock
	private TeamInfoRepository teamInfoRepository;
	@Mock
	private StageParamRepository stageParamRepository;
	@Mock
	private StageGroupRepository stageGroupRepository;
	@Mock
	private ResponseFileParamRepository responseFileParamRepository;
	@Mock
	private ResponseFileModelRepository responseFileModelRepository;
	@Mock
	private FormDesignRepository formDesignRepository;
	@Mock
	private RallyParamRepository rallyParamRepository;

	@Test
	void exportIncludesRallyAndEditableFormDesigns() throws Exception {
		RallyParam rally = new RallyParam();
		rally.setTitle("Rallye test");
		FormDesign design = new FormDesign();
		design.setId("stage-id");
		design.setStageParamId("stage-id");
		design.setUpdatedAt(Instant.parse("2026-07-23T20:00:00Z"));

		when(rallyParamRepository.findById(RallyParam.SINGLETON_ID)).thenReturn(Optional.of(rally));
		when(formDesignRepository.findAll()).thenReturn(java.util.List.of(design));
		when(teamInfoService.getTeamInfos()).thenReturn(java.util.List.of());
		when(stageGroupRepository.findAll()).thenReturn(java.util.List.of());
		when(stageParamService.getStageParams()).thenReturn(java.util.List.of());
		when(responseFileParamService.getReferenceResponseFileParam()).thenReturn(Optional.empty());

		ByteArrayOutputStream output = new ByteArrayOutputStream();
		sharingService.loadParamZip(output);

		Set<String> entries = zipEntries(output.toByteArray());
		assertTrue(entries.contains("rally/rally.json"));
		assertTrue(entries.contains("formDesign/formDesign-stage-id.json"));
	}

	@Test
	void importRestoresStageIdsBeforeFormDesigns() throws Exception {
		RallyParam rally = new RallyParam();
		rally.setTitle("Rallye restauré");
		StageParam stage = new StageParam(83);
		stage.setId("stage-id");
		stage.setVersion(12L);
		stage.setName("Épreuve restaurée");
		FormDesign design = new FormDesign();
		design.setId("stage-id");
		design.setVersion(4L);
		design.setStageParamId("stage-id");

		byte[] archive = archive(rally, stage, design);
		MockMultipartFile file = new MockMultipartFile("file", "configuration.zip",
				"application/zip", archive);

		sharingService.uploadParamZip(file);

		verify(stageParamRepository).insert(any(StageParam.class));
		verify(formDesignRepository).insert(any(FormDesign.class));
		verify(rallyParamRepository).insert(any(RallyParam.class));
	}

	@Test
	void invalidArchiveDoesNotDeleteCurrentConfiguration() throws Exception {
		ResponseFileParam responseFile = new ResponseFileParam();
		responseFile.setStage(83);
		responseFile.setPage(1);
		ByteArrayOutputStream output = new ByteArrayOutputStream();
		try (ZipOutputStream zip = new ZipOutputStream(output)) {
			write(zip, "stageParam/stageParam-83/responseFile-83-1/responseFile-83-1.json",
					responseFile);
		}
		MockMultipartFile file = new MockMultipartFile("file", "configuration-incomplete.zip",
				"application/zip", output.toByteArray());

		org.junit.jupiter.api.Assertions.assertThrows(IOException.class,
				() -> sharingService.uploadParamZip(file));

		verify(stageParamRepository, never()).deleteAll();
		verify(formDesignRepository, never()).deleteAll();
	}

	private byte[] archive(RallyParam rally, StageParam stage, FormDesign design) throws Exception {
		ByteArrayOutputStream output = new ByteArrayOutputStream();
		try (ZipOutputStream zip = new ZipOutputStream(output)) {
			write(zip, "rally/rally.json", rally);
			write(zip, "stageParam/stageParam-83/stageParam-83.json", stage);
			write(zip, "formDesign/formDesign-stage-id.json", design);
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
