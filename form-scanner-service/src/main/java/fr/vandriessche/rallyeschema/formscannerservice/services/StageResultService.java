package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceResult;
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

	public void updateResponceResults(Integer stage, Integer team, List<ResponceResult> results) {
		if (team == null)
			return;
		StageResult stageResult = this.getStageResultsByStageAndTeam(stage, team).orElse(new StageResult(stage, team));
		for (var result : results) {
			stageResult.getResults().removeIf(r -> r.getName().equals(result.getName()));
			stageResult.getResults().add(result);
		}
		stageResult.getResults().sort(Comparator.comparing(ResponceResult::getName));
		stageResult = stageResultRepository.save(stageResult);
		teamPointService.computeTeamPoint(stageResult);
	}

	public Optional<StageResult> getStageResultsByStageAndTeam(Integer stage, Integer team) {
		var stages = stageResultRepository.findByStageAndTeam(stage, team);
		if (stages.size() == 1)
			return Optional.of(stages.get(0));
		return Optional.empty();
	}

	public List<StageResult> getStageResultsByTeam(Integer team) {
		return stageResultRepository.findByTeam(team);
	}
}
