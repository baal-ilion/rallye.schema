package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.time.LocalDateTime;
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
	@Autowired
	private TeamInfoService teamInfoService;
	@Autowired
	private StageParamService stageParamService;

	public StageResult beginStageResult(Integer stage, Integer team) {
		StageResult stageResult = findOrMakeStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult))
			return updateStageResult(stageResult, null, new ArrayList<>(), new ArrayList<>(), LocalDateTime.now(),
					null);
		return null;
	}

	public StageResult cancelStageResult(int stage, int team) {
		StageResult stageResult = getStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult)) {
			stageResult.setBegin(null);
			stageResult.setEnd(null);
			return stageResultRepository.save(stageResult);
		}
		return null;
	}

	public StageResult endStageResult(Integer stage, Integer team) {
		StageResult stageResult = getStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult))
			return updateStageResult(stageResult, null, new ArrayList<>(), new ArrayList<>(), null,
					LocalDateTime.now());
		return null;
	}

	public StageResult getStageResult(String id) {
		return stageResultRepository.findById(id).orElseThrow();
	}

	public StageResult getStageResultByStageAndTeam(Integer stage, Integer team) {
		return stageResultRepository.findByStageAndTeam(stage, team).orElse(null);
	}

	public List<StageResult> getStageResults() {
		return stageResultRepository.findAll();
	}

	public List<StageResult> getStageResultsByTeam(Integer team) {
		return stageResultRepository.findByTeam(team);
	}

	public StageResult undoStageResult(int stage, int team) {
		StageResult stageResult = getStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult)) {
			stageResult.setEnd(null);
			return stageResultRepository.save(stageResult);
		}
		return null;
	}

	public void updateResponseResults(Integer stage, Integer team, List<ResponseResult> results) {
		StageResult stageResult = findOrMakeStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult))
			updateStageResult(stageResult, null, results, new ArrayList<>(), null, null);
	}

	public StageResult updateStageResult(StageResult stageResult) {
		StageResult stageResultToUpdate = Objects.nonNull(stageResult.getId())
				? stageResultRepository.findById(stageResult.getId()).orElseThrow()
				: stageResultRepository.findByStageAndTeam(stageResult.getStage(), stageResult.getTeam()).orElseThrow();
		return updateStageResult(stageResultToUpdate, stageResult.getChecked(), stageResult.getResults(),
				stageResult.getPreformances(), stageResult.getBegin(), stageResult.getEnd());
	}

	private StageResult findOrMakeStageResultByStageAndTeam(Integer stage, Integer team) {
		if (Objects.isNull(stage))
			return null;
		if (Objects.isNull(team))
			return null;
		return stageResultRepository.findByStageAndTeam(stage, team).orElse(makeStageResult(stage, team));
	}

	private StageResult makeStageResult(Integer stage, Integer team) {
		if (Objects.nonNull(teamInfoService.getTeamInfoByTeam(team))
				&& Objects.nonNull(stageParamService.getStageParamByStage(stage)))
			return new StageResult(stage, team);
		return null;
	}

	private StageResult updateStageResult(StageResult stageResultToUpdate, Boolean checked,
			List<ResponseResult> results, List<PreformanceResult> performances, LocalDateTime begin,
			LocalDateTime end) {
		if (Objects.nonNull(checked))
			stageResultToUpdate.setChecked(checked);
		if (Objects.nonNull(begin))
			stageResultToUpdate.setBegin(begin);
		if (Objects.nonNull(end))
			stageResultToUpdate.setEnd(end);
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
