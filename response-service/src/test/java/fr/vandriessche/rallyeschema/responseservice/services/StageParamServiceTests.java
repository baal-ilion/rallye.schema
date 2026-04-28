package fr.vandriessche.rallyeschema.responseservice.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StagePoint;
import fr.vandriessche.rallyeschema.responseservice.entities.StageRanking;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResponse;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileInfoRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageGroupRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageRankingRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageResponseRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageResultRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamPointRepository;

@ExtendWith(MockitoExtension.class)
class StageParamServiceTests {
	@InjectMocks
	private StageParamService stageParamService;

	@Mock
	private StageParamRepository stageParamRepository;
	@Mock
	private StageGroupRepository stageGroupRepository;
	@Mock
	private ResponseFileParamRepository responseFileParamRepository;
	@Mock
	private ResponseFileInfoRepository responseFileInfoRepository;
	@Mock
	private StageResponseRepository stageResponseRepository;
	@Mock
	private StageResultRepository stageResultRepository;
	@Mock
	private StageRankingRepository stageRankingRepository;
	@Mock
	private TeamPointRepository teamPointRepository;

	@Test
	void updateStageParamMigratesDependentStageNumbers() {
		StageParam existingStageParam = new StageParam(45);
		existingStageParam.setId("stage-param-id");
		existingStageParam.setName("Ancienne epreuve");

		ResponseFileParam linkedResponseFileParam = new ResponseFileParam();
		linkedResponseFileParam.setId("response-file-param-id");
		linkedResponseFileParam.setStage(45);
		linkedResponseFileParam.setPage(1);
		existingStageParam.getResponseFileParams().add(linkedResponseFileParam);

		StageParam update = new StageParam();
		update.setId(existingStageParam.getId());
		update.setStage(46);
		update.setName("Nouvelle epreuve");

		ResponseFileParam storedResponseFileParam = new ResponseFileParam();
		storedResponseFileParam.setId(linkedResponseFileParam.getId());
		storedResponseFileParam.setStage(45);
		storedResponseFileParam.setPage(1);

		ResponseFileInfo responseFileInfo = new ResponseFileInfo();
		responseFileInfo.setStage(45);
		responseFileInfo.setTeam(7);
		responseFileInfo.setPage(1);

		StageResponse stageResponse = new StageResponse();
		stageResponse.setStage(45);
		stageResponse.setTeam(7);

		StageResult stageResult = new StageResult(45, 7);

		StageRanking stageRanking = new StageRanking(45);

		TeamPoint teamPoint = new TeamPoint(7);
		teamPoint.getStagePoints().put(45, new StagePoint(45, 12L));

		when(stageParamRepository.findById(existingStageParam.getId())).thenReturn(Optional.of(existingStageParam));
		when(stageParamRepository.findByStage(46)).thenReturn(Optional.empty());
		when(stageParamRepository.save(any(StageParam.class))).thenAnswer(invocation -> invocation.getArgument(0));

		when(responseFileParamRepository.findByStage(46)).thenReturn(List.of());
		when(responseFileParamRepository.findByStage(45)).thenReturn(List.of(storedResponseFileParam));
		when(responseFileInfoRepository.findByStage(46)).thenReturn(List.of());
		when(responseFileInfoRepository.findByStage(45)).thenReturn(List.of(responseFileInfo));
		when(stageResponseRepository.findByStage(46)).thenReturn(List.of());
		when(stageResponseRepository.findByStage(45)).thenReturn(List.of(stageResponse));
		when(stageResultRepository.findByStage(46)).thenReturn(List.of());
		when(stageResultRepository.findByStage(45)).thenReturn(List.of(stageResult));
		when(stageRankingRepository.findByStage(46)).thenReturn(Optional.empty());
		when(stageRankingRepository.findByStage(45)).thenReturn(Optional.of(stageRanking));
		List<TeamPoint> teamPoints = List.of(teamPoint);
		when(teamPointRepository.findAll()).thenReturn(teamPoints).thenReturn(teamPoints);

		StageParam result = stageParamService.updateStageParam(update);

		assertEquals(46, result.getStage());
		assertEquals(46, linkedResponseFileParam.getStage());
		assertEquals(46, storedResponseFileParam.getStage());
		assertEquals(46, responseFileInfo.getStage());
		assertEquals(46, stageResponse.getStage());
		assertEquals(46, stageResult.getStage());
		assertEquals(46, stageRanking.getStage());
		assertFalse(teamPoint.getStagePoints().containsKey(45));
		assertTrue(teamPoint.getStagePoints().containsKey(46));
		assertEquals(46, teamPoint.getStagePoints().get(46).getStage());

		verify(responseFileParamRepository).save(storedResponseFileParam);
		verify(responseFileInfoRepository).save(responseFileInfo);
		verify(stageResponseRepository).save(stageResponse);
		verify(stageResultRepository).save(stageResult);
		verify(stageRankingRepository).save(stageRanking);
		verify(teamPointRepository).save(teamPoint);
	}
}
