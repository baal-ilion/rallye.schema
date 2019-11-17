package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.formscannerservice.entities.PreformanceResult;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResult;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.StageResultRepository;

@Service
public class StageResultService {
	@Autowired
	private StageResultRepository stageResultRepository;
	@Autowired
	private TeamPointService teamPointService;

	public StageResult getStageResult(String id) {
		return stageResultRepository.findById(id).orElseThrow();
	}

	public List<StageResult> getStageResults() {
		return stageResultRepository.findAll();
	}

	public StageResult getStageResultByStageAndTeam(Integer stage, Integer team) {
		return stageResultRepository.findByStageAndTeam(stage, team).orElse(null);
	}

	public List<StageResult> getStageResultsByTeam(Integer team) {
		return stageResultRepository.findByTeam(team);
	}

	public void updateResponseResults(Integer stage, Integer team, List<ResponseResult> results) {
		if (Objects.isNull(team))
			return;
		StageResult stageResult = getStageResultByStageAndTeam(stage, team);
		if (Objects.isNull(stageResult))
			stageResult = new StageResult(stage, team);
		updateStageResult(stageResult, null, results, new ArrayList<>());
	}

	public StageResult updateStageResult(StageResult stageResult) {
		StageResult stageResultToUpdate = Objects.nonNull(stageResult.getId())
				? stageResultRepository.findById(stageResult.getId()).orElseThrow()
				: stageResultRepository.findByStageAndTeam(stageResult.getStage(), stageResult.getTeam()).orElseThrow();
		return updateStageResult(stageResultToUpdate, stageResult.getChecked(), stageResult.getResults(),
				stageResult.getPreformances());
	}

	private StageResult updateStageResult(StageResult stageResultToUpdate, Boolean checked,
			List<ResponseResult> results, List<PreformanceResult> performances) {
		if (Objects.nonNull(checked))
			stageResultToUpdate.setChecked(checked);
		for (var result : results) {
			stageResultToUpdate.getResults().removeIf(r -> r.getName().equals(result.getName()));
			stageResultToUpdate.getResults().add(result);
		}
		for (var performance : performances) {
			stageResultToUpdate.getPreformances().removeIf(r -> r.getName().equals(performance.getName()));
			stageResultToUpdate.getPreformances().add(performance);
		}
		stageResultToUpdate.getResults().sort(Comparator.comparing(ResponseResult::getName));
		stageResultToUpdate = stageResultRepository.save(stageResultToUpdate);
		teamPointService.computeTeamPoint(stageResultToUpdate);
		return stageResultToUpdate;
	}
}
