package fr.vandriessche.rallyeschema.responseservice.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import fr.vandriessche.rallyeschema.responseservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.repositories.FormDesignRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageParamRepository;

@ExtendWith(MockitoExtension.class)
class FormDesignServiceTests {
	@InjectMocks
	private FormDesignService formDesignService;
	@Mock
	private FormDesignRepository formDesignRepository;
	@Mock
	private StageParamRepository stageParamRepository;

	@Test
	void saveStageDesignLinksItToAnExistingStage() {
		StageParam stage = new StageParam(45);
		stage.setId("stage-id");
		FormDesign design = new FormDesign();
		design.setSchemaVersion(6);
		when(stageParamRepository.findById("stage-id")).thenReturn(Optional.of(stage));
		when(formDesignRepository.findByStageParamId("stage-id")).thenReturn(Optional.empty());
		when(formDesignRepository.save(any(FormDesign.class))).thenAnswer(invocation -> invocation.getArgument(0));

		FormDesign result = formDesignService.saveStageFormDesign("stage-id", design);

		assertSame(design, result);
		assertEquals("stage-id", result.getId());
		assertEquals("stage-id", result.getStageParamId());
		assertEquals(6, result.getSchemaVersion());
	}

	@Test
	void referenceDesignIsNeverLinkedToAStage() {
		FormDesign design = new FormDesign();
		design.setStageParamId("old-stage");
		when(formDesignRepository.findById(FormDesign.REFERENCE_ID)).thenReturn(Optional.empty());
		when(formDesignRepository.save(any(FormDesign.class))).thenAnswer(invocation -> invocation.getArgument(0));

		FormDesign result = formDesignService.saveReferenceFormDesign(design);

		assertEquals(FormDesign.REFERENCE_ID, result.getId());
		assertNull(result.getStageParamId());
	}

	@Test
	void deleteStageDesignDoesNotDeleteTheStage() {
		formDesignService.deleteStageFormDesign("stage-id");

		verify(formDesignRepository).deleteByStageParamId("stage-id");
	}
}
