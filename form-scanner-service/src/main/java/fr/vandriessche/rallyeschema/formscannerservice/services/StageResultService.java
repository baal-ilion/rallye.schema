package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.formscannerservice.entities.PreformanceResult;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileSource;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResult;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.StageResultRepository;
import lombok.extern.java.Log;

@Service
@Log
public class StageResultService {
	@Autowired
	private StageResultRepository stageResultRepository;
	@Autowired
	private TeamPointService teamPointService;
	@Autowired
	private TeamInfoService teamInfoService;
	@Autowired
	private StageParamService stageParamService;
	@Autowired
	private ResponseFileService responseFileService;

	public StageResult beginStageResult(Integer stage, Integer team) {
		StageResult stageResult = findOrMakeStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult))
			return updateStageResultAndSave(stageResult, null, new ArrayList<>(), new ArrayList<>(),
					LocalDateTime.now(), null);
		return null;
	}

	public StageResult cancelStageResult(int stage, int team) {
		StageResult stageResult = getStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult)) {
			stageResult.setBegin(null);
			stageResult.setEnd(null);
			return save(stageResult);
		}
		return null;
	}

	public StageResult endStageResult(Integer stage, Integer team) {
		StageResult stageResult = getStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult))
			return updateStageResultAndSave(stageResult, null, new ArrayList<>(), new ArrayList<>(), null,
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

	public void removeResponseFileEvent(String id) {
		var stageResults = stageResultRepository.findByResponseSourceId(id, ResponseFileSource.class.getName());
		for (var stageResult : stageResults) {
			removeResponseFileAndSearch(stageResult, id);
			save(stageResult);
		}
	}

	public StageResult undoStageResult(int stage, int team) {
		StageResult stageResult = getStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult)) {
			stageResult.setEnd(null);
			return save(stageResult);
		}
		return null;
	}

	public void updateResponseFileEvent(String id) {
		var responseFileInfo = responseFileService.getResponseFileInfo(id);
		var stageResults = stageResultRepository.findByResponseSourceId(id, ResponseFileSource.class.getName());
		boolean found = false;
		for (var stageResult : stageResults) {
			log.info("updateResponseFileEvent: " + stageResult.getId());
			if (Objects.nonNull(responseFileInfo) && stageResult.getStage().equals(responseFileInfo.getStage())
					&& stageResult.getTeam().equals(responseFileInfo.getTeam())) {
				found = true;
				updateResponseFile(stageResult, responseFileInfo);
				save(stageResult);
			} else {
				removeResponseFileAndSearch(stageResult, id);
				save(stageResult);
			}
		}
		if (!found && Objects.nonNull(responseFileInfo)) {
			StageResult stageResult = findOrMakeStageResultByStageAndTeam(responseFileInfo.getStage(),
					responseFileInfo.getTeam());
			updateResponseFile(stageResult, responseFileInfo);
			save(stageResult);
		}
	}

	public StageResult updateStageResult(StageResult stageResult) {
		StageResult stageResultToUpdate = Objects.nonNull(stageResult.getId())
				? stageResultRepository.findById(stageResult.getId()).orElseThrow()
				: stageResultRepository.findByStageAndTeam(stageResult.getStage(), stageResult.getTeam()).orElseThrow();
		return updateStageResultAndSave(stageResultToUpdate, stageResult.getChecked(), stageResult.getResults(),
				stageResult.getPreformances(), stageResult.getBegin(), stageResult.getEnd());
	}

	private boolean checkResponseFileSources(StageResult stageResult, ResponseFileInfo responseFileInfo) {
		ResponseFileSource source = new ResponseFileSource(responseFileInfo.getId());
		if (stageResult.getResponseSources().contains(source))
			return true;
		if (!Boolean.TRUE.equals(responseFileInfo.getChecked()))
			return false;
		// Il ne doit pas y avoir la même feuille de réponse
		return responseFileService.getSameResponseFileInfos(responseFileInfo).stream()
				.map(r -> new ResponseFileSource(r.getId()))
				.noneMatch(s -> stageResult.getResponseSources().contains(s));
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

	private void removeResponseFile(StageResult stageResult, String id) {
		ResponseFileSource sourceToRemove = new ResponseFileSource(id);
		stageResult.getResponseSources().removeIf(source -> sourceToRemove.equals(source));
		stageResult.getResults().removeIf(result -> sourceToRemove.equals(result.getSource()));
		stageResult.getPreformances().removeIf(perf -> sourceToRemove.equals(perf.getSource()));
	}

	private void removeResponseFileAndSearch(StageResult stageResult, String id) {
		removeResponseFile(stageResult, id);
		searchResponseFile(stageResult, null, id);
	}

	private StageResult save(StageResult stageResult) {
		stageResult = stageResultRepository.save(stageResult);
		teamPointService.computeTeamPoint(stageResult);
		return stageResult;
	}

	private void searchResponseFile(StageResult stageResult, Integer page, String excludedResponseFileId) {
		var responseFiles = Objects.nonNull(page)
				? responseFileService.getResponseFileInfosByStageAndPageAndTeam(stageResult.getStage(), page,
						stageResult.getTeam())
				: responseFileService.getResponseFileInfosByStageAndTeam(stageResult.getStage(), stageResult.getTeam());
		responseFiles.forEach(responseFileInfo -> {
			if (!responseFileInfo.getId().equals(excludedResponseFileId)
					&& checkResponseFileSources(stageResult, responseFileInfo)) {
				setResponseFile(stageResult, responseFileInfo);
				if (Objects.nonNull(page))
					return;
			}
		});
	}

	private void setResponseFile(StageResult stageResult, ResponseFileInfo responseFileInfo) {
		responseFileService.getSameResponseFileInfos(responseFileInfo)
				.forEach(r -> removeResponseFile(stageResult, r.getId()));
		ResponseFileSource source = new ResponseFileSource(responseFileInfo.getId());
		if (!stageResult.getResponseSources().contains(source))
			stageResult.getResponseSources().add(source);
		updateStageResult(stageResult, null, responseFileService.getResponseResultFromResponseFile(responseFileInfo),
				new ArrayList<>(), null, null);
	}

	private void updateResponseFile(StageResult stageResult, ResponseFileInfo responseFileInfo) {
		if (checkResponseFileSources(stageResult, responseFileInfo)) {
			setResponseFile(stageResult, responseFileInfo);
		} else {
			removeResponseFileAndSearch(stageResult, responseFileInfo.getId());
		}
	}

	private boolean updateStageResult(StageResult stageResultToUpdate, Boolean checked, List<ResponseResult> results,
			List<PreformanceResult> performances, LocalDateTime begin, LocalDateTime end) {
		boolean isUpdated = false;

		if (Objects.nonNull(begin)) {
			stageResultToUpdate.setBegin(begin);
			isUpdated = true;
		}
		if (Objects.nonNull(end)) {
			stageResultToUpdate.setEnd(end);
			isUpdated = true;
		}
		for (var result : results) {
			stageResultToUpdate.getResults().removeIf(r -> r.getName().equals(result.getName()));
			stageResultToUpdate.getResults().add(result);
			isUpdated = true;
		}
		for (var performance : performances) {
			stageResultToUpdate.getPreformances().removeIf(r -> r.getName().equals(performance.getName()));
			stageResultToUpdate.getPreformances().add(performance);
			isUpdated = true;
		}
		stageResultToUpdate.getResults().sort(Comparator.comparing(ResponseResult::getName));
		if (isUpdated)
			stageResultToUpdate.setChecked(false);
		if (Objects.nonNull(checked)) {
			stageResultToUpdate.setChecked(checked);
			isUpdated = true;
		}
		return isUpdated;
	}

	private StageResult updateStageResultAndSave(StageResult stageResultToUpdate, Boolean checked,
			List<ResponseResult> results, List<PreformanceResult> performances, LocalDateTime begin,
			LocalDateTime end) {
		if (updateStageResult(stageResultToUpdate, checked, results, performances, begin, end))
			return save(stageResultToUpdate);
		return stageResultToUpdate;
	}

}
