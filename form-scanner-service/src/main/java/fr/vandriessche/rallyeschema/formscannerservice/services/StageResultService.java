package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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

	public StageResult getStageResultsByStageAndTeam(Integer stage, Integer team) {
		return stageResultRepository.findByStageAndTeam(stage, team).orElse(null);
	}

	public List<StageResult> getStageResultsByTeam(Integer team) {
		return stageResultRepository.findByTeam(team);
	}

	public void updateResponseResults(Integer stage, Integer team, List<ResponseResult> results) {
		if (team == null)
			return;
		StageResult stageResult = getStageResultsByStageAndTeam(stage, team);
		if (stageResult == null)
			stageResult = new StageResult(stage, team);
		updateStageResult(stageResult, null, results);
	}

	public StageResult updateStageResult(StageResult stageResult) {
		StageResult stageResultToUpdate = stageResult.getId() != null
				? stageResultRepository.findById(stageResult.getId()).orElseThrow()
				: stageResultRepository.findByStageAndTeam(stageResult.getStage(), stageResult.getTeam()).orElseThrow();
		return updateStageResult(stageResultToUpdate, stageResult.getChecked(), stageResult.getResults());
	}

	private StageResult updateStageResult(StageResult stageResultToUpdate, Boolean checked,
			List<ResponseResult> results) {
		if (checked != null)
			stageResultToUpdate.setChecked(checked);
		for (var result : results) {
			stageResultToUpdate.getResults().removeIf(r -> r.getName().equals(result.getName()));
			stageResultToUpdate.getResults().add(result);
		}
		stageResultToUpdate.getResults().sort(Comparator.comparing(ResponseResult::getName));
		stageResultToUpdate = stageResultRepository.save(stageResultToUpdate);
		teamPointService.computeTeamPoint(stageResultToUpdate);
		return stageResultToUpdate;
	}
}
