package fr.vandriessche.rallyeschema.responseservice.services;

import static org.springframework.data.mongodb.core.aggregation.Aggregation.match;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.newAggregation;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.sort;

import java.io.IOException;
import java.security.InvalidAlgorithmParameterException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.xml.parsers.ParserConfigurationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.xml.sax.SAXException;

import com.albertoborsetta.formscanner.api.exceptions.FormScannerException;

import fr.vandriessche.rallyeschema.responseservice.entities.PerformanceResult;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileSource;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResponse;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResponseSource;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;
import fr.vandriessche.rallyeschema.responseservice.message.StageResultMessage;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageResultRepository;
import lombok.extern.java.Log;

@Service
@Log
public class StageResultService {
	public static final String STAGE_RESULT_CREATE_EVENT = "stageResult.create";
	public static final String STAGE_RESULT_UPDATE_EVENT = "stageResult.update";
	public static final String STAGE_RESULT_DELETE_EVENT = "stageResult.delete";

	@Autowired
	private StageResultRepository stageResultRepository;
	@Autowired
	private MongoTemplate mongoTemplate;

	@Autowired
	private TeamInfoService teamInfoService;
	@Autowired
	private StageParamService stageParamService;
	@Autowired
	private ResponseFileService responseFileService;
	@Autowired
	private StageResponseService stageResponseService;
	@Autowired
	private MessageProducerService messageProducerService;

	public StageResult beginStageResult(Integer stage, Integer team) {
		StageResult stageResult = findOrMakeStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult))
			return updateStageResultAndSave(stageResult, null, new ArrayList<>(), new ArrayList<>(),
					Instant.now().truncatedTo(ChronoUnit.SECONDS), null);
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

	public void deleteByTeam(Integer team) {
		stageResultRepository.findByTeam(team).forEach(stageResult -> {
			stageResultRepository.delete(stageResult);
			messageProducerService.sendMessage(STAGE_RESULT_DELETE_EVENT, new StageResultMessage(stageResult));
		});
	}

	public StageResult endStageResult(Integer stage, Integer team) {
		StageResult stageResult = getStageResultByStageAndTeam(stage, team);
		if (Objects.nonNull(stageResult))
			return updateStageResultAndSave(stageResult, null, new ArrayList<>(), new ArrayList<>(), null,
					Instant.now().truncatedTo(ChronoUnit.SECONDS));
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

	public List<StageResult> getStageResults(Integer stage, Integer team, Boolean checked, Boolean entered,
			Boolean finished, Sort by) {
		List<Criteria> crits = new ArrayList<>();
		if (Objects.nonNull(stage))
			crits.add(Criteria.where("stage").is(stage));
		if (Objects.nonNull(team))
			crits.add(Criteria.where("team").is(team));
		if (Boolean.TRUE.equals(checked))
			crits.add(Criteria.where("checked").is(Boolean.TRUE));
		if (Boolean.FALSE.equals(checked))
			crits.add(Criteria.where("checked").ne(Boolean.TRUE));
		if (Boolean.TRUE.equals(entered))
			crits.add(Criteria.where("missing").is(0));
		if (Boolean.FALSE.equals(entered))
			crits.add(Criteria.where("missing").ne(0));
		if (Boolean.TRUE.equals(finished))
			crits.add(new Criteria().andOperator(Criteria.where("begin").ne(null), Criteria.where("end").ne(null)));
		if (Boolean.FALSE.equals(finished))
			crits.add(new Criteria().orOperator(Criteria.where("begin").is(null), Criteria.where("end").is(null)));
		List<AggregationOperation> aggs = new ArrayList<>();
		if (crits.size() == 1) {
			aggs.add(match(crits.get(0)));
		} else if (crits.size() > 1) {
			aggs.add(match(crits.remove(0).andOperator(crits.toArray(new Criteria[crits.size()]))));
		}
		aggs.add(sort(by));
		Aggregation agg = newAggregation(aggs);
		var results = mongoTemplate.aggregate(agg, StageResult.class, StageResult.class);
		return results.getMappedResults();
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

	public void removeStageResponseEvent(String id) {
		var stageResults = stageResultRepository.findByResponseSourceId(id, StageResponseSource.class.getName());
		for (var stageResult : stageResults) {
			removeStageResponseAndSearch(stageResult, id);
			save(stageResult);
		}
	}

	@Transactional
	public StageResult selectResponseFile(Integer stage, Integer team, String[] responseFileIds, Boolean delete)
			throws InvalidAlgorithmParameterException, ParserConfigurationException, SAXException, IOException,
			FormScannerException {
		var responseFileInfos = Stream.of(responseFileIds)
				.map(responseFileId -> responseFileService.getResponseFileInfo(responseFileId))
				.collect(Collectors.toList());
		if (!responseFileInfos.isEmpty()) {
			for (var responseFileInfo : responseFileInfos) {
				if (!responseFileInfo.getStage().equals(stage) || !responseFileInfo.getTeam().equals(team))
					throw new InvalidAlgorithmParameterException(
							"the responseFileIds parameter must be for same stage and team");
			}
			if (responseFileInfos.stream().map(ResponseFileInfo::getPage).distinct().count() != responseFileIds.length)
				throw new InvalidAlgorithmParameterException(
						"the responseFileIds parameter must be for different pages");
			StageResult stageResult = findOrMakeStageResultByStageAndTeam(stage, team);
			if (Objects.nonNull(stageResult)) {
				return selectResponseFile(stageResult, responseFileInfos, delete);
			}
		}
		return null;
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

	public void updateStageResponseEvent(String id) {
		var stageResponse = stageResponseService.getStageResponse(id);
		var stageResults = stageResultRepository.findByResponseSourceId(id, StageResponseSource.class.getName());
		boolean found = false;
		for (var stageResult : stageResults) {
			log.info("updateResponseFileEvent: " + stageResult.getId());
			if (Objects.nonNull(stageResponse) && stageResult.getStage().equals(stageResponse.getStage())
					&& stageResult.getTeam().equals(stageResponse.getTeam())) {
				found = true;
				updateStageResponse(stageResult, stageResponse);
				save(stageResult);
			} else {
				removeStageResponseAndSearch(stageResult, id);
				save(stageResult);
			}
		}
		if (!found && Objects.nonNull(stageResponse)) {
			StageResult stageResult = findOrMakeStageResultByStageAndTeam(stageResponse.getStage(),
					stageResponse.getTeam());
			updateStageResponse(stageResult, stageResponse);
			save(stageResult);
		}
	}

	public StageResult updateStageResult(StageResult stageResult) {
		StageResult stageResultToUpdate = Objects.nonNull(stageResult.getId())
				? stageResultRepository.findById(stageResult.getId()).orElseThrow()
				: stageResultRepository.findByStageAndTeam(stageResult.getStage(), stageResult.getTeam()).orElseThrow();
		return updateStageResultAndSave(stageResultToUpdate, stageResult.getChecked(), stageResult.getResults(),
				stageResult.getPerformances(), stageResult.getBegin(), stageResult.getEnd());
	}

	private boolean checkResponseFileSources(StageResult stageResult, ResponseFileInfo responseFileInfo) {
		ResponseFileSource source = new ResponseFileSource(responseFileInfo.getId());
		if (!Boolean.TRUE.equals(responseFileInfo.getChecked()))
			return false;
		if (stageResult.getResponseSources().contains(source))
			return true;
		// Il ne doit pas y avoir de réponce
		if (stageResult.getResponseSources().stream().anyMatch(s -> s.getClass().equals(StageResponseSource.class)))
			return false;
		// Il ne doit pas y avoir la même feuille de réponse
		return responseFileService.getSameResponseFileInfos(responseFileInfo).stream()
				.map(r -> new ResponseFileSource(r.getId()))
				.noneMatch(s -> stageResult.getResponseSources().contains(s));
	}

	private boolean checkStageResponseSources(StageResult stageResult, StageResponse stageResponse) {
		StageResponseSource source = new StageResponseSource(stageResponse.getId(), null);
		if (stageResult.getResponseSources().contains(source))
			return true;
		return stageResponse.isFinalised() && stageResponse.isActive();
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
		stageResult.getPerformances().removeIf(perf -> sourceToRemove.equals(perf.getSource()));
	}

	private void removeResponseFileAndSearch(StageResult stageResult, String id) {
		removeResponseFile(stageResult, id);
		if (!searchStageResponse(stageResult, null))
			searchResponseFile(stageResult, null, id);
	}

	private void removeStageResponse(StageResult stageResult, String id) {
		StageResponseSource sourceToRemove = new StageResponseSource(id, null);
		stageResult.getResponseSources().removeIf(source -> sourceToRemove.equals(source));
		stageResult.getResults().removeIf(result -> sourceToRemove.equals(result.getSource()));
		stageResult.getPerformances().removeIf(perf -> sourceToRemove.equals(perf.getSource()));
	}

	private void removeStageResponseAndSearch(StageResult stageResult, String id) {
		removeStageResponse(stageResult, id);
		if (!searchStageResponse(stageResult, id))
			searchResponseFile(stageResult, null, null);
	}

	private StageResult save(StageResult stageResult) {
		stageResult = stageResultRepository.save(stageResult);
		messageProducerService.sendMessage(STAGE_RESULT_UPDATE_EVENT, new StageResultMessage(stageResult));
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

	private boolean searchStageResponse(StageResult stageResult, String excludedStageResponseId) {
		StageResponse stageResponse = stageResponseService.getStageResponseByStageAndTeam(stageResult.getStage(),
				stageResult.getTeam());
		if (Objects.nonNull(stageResponse) && !stageResponse.getId().equals(excludedStageResponseId)
				&& checkStageResponseSources(stageResult, stageResponse)) {
			setStageResponse(stageResult, stageResponse);
			return true;
		}
		return false;
	}

	private StageResult selectResponseFile(StageResult stageResult, List<ResponseFileInfo> responseFileInfos,
			Boolean delete) throws ParserConfigurationException, SAXException, IOException, FormScannerException {
		var toUpdate = new ArrayList<ResponseFileInfo>();
		var initalSources = stageResult.getResponseSources().stream()
				.filter(s -> s.getClass().equals(ResponseFileSource.class)).collect(Collectors.toList());

		for (var responseFileInfo : responseFileInfos) {
			if (!Boolean.TRUE.equals(responseFileInfo.getChecked())) {
				responseFileInfo.setChecked(true);
				toUpdate.add(responseFileInfo);
			}
			setResponseFile(stageResult, responseFileInfo);
		}
		stageResult = save(stageResult);
		for (var responseFileInfo : toUpdate) {
			responseFileService.updateResponseFileInfo(responseFileInfo);
		}
		if (Boolean.TRUE.equals(delete)) {
			for (var source : initalSources) {
				if (!stageResult.getResponseSources().contains(source))
					responseFileService.deleteResponseFile(source.getId());
			}
		}
		return stageResult;
	}

	private void setResponseFile(StageResult stageResult, ResponseFileInfo responseFileInfo) {
		responseFileService.getSameResponseFileInfos(responseFileInfo)
				.forEach(r -> removeResponseFile(stageResult, r.getId()));
		StageResponse stageResponse = stageResponseService.getStageResponseByStageAndTeam(responseFileInfo.getStage(),
				responseFileInfo.getTeam());
		if (Objects.nonNull(stageResponse))
			removeStageResponse(stageResult, stageResponse.getId());
		ResponseFileSource source = new ResponseFileSource(responseFileInfo.getId());
		if (!stageResult.getResponseSources().contains(source))
			stageResult.getResponseSources().add(source);
		updateStageResult(stageResult, null, responseFileService.getResponseResultFromResponseFile(responseFileInfo),
				responseFileService.getPerformanceResultFromResponseFile(responseFileInfo), null, null);
	}

	private void setStageResponse(StageResult stageResult, StageResponse stageResponse) {
		responseFileService.getResponseFileInfosByStageAndTeam(stageResponse.getStage(), stageResponse.getTeam())
				.forEach(r -> removeStageResponse(stageResult, r.getId()));
		StageResponseSource source = new StageResponseSource(stageResponse.getId(),
				Objects.nonNull(stageResponse.getQuestions()) || Objects.nonNull(stageResponse.getTotal()));
		if (!stageResult.getResponseSources().contains(source))
			stageResult.getResponseSources().add(source);
		updateStageResult(stageResult, null, stageResponseService.getResponseResultFromStageResponse(stageResponse),
				stageResponseService.getPerformanceResultFromStageResponse(stageResponse), stageResponse.getBegin(),
				stageResponse.getEnd());
	}

	private void updateResponseFile(StageResult stageResult, ResponseFileInfo responseFileInfo) {
		if (checkResponseFileSources(stageResult, responseFileInfo)) {
			setResponseFile(stageResult, responseFileInfo);
		} else {
			removeResponseFileAndSearch(stageResult, responseFileInfo.getId());
		}
	}

	private void updateStageResponse(StageResult stageResult, StageResponse stageResponse) {
		if (checkStageResponseSources(stageResult, stageResponse)) {
			setStageResponse(stageResult, stageResponse);
		} else {
			removeStageResponseAndSearch(stageResult, stageResponse.getId());
		}
	}

	private boolean updateStageResult(StageResult stageResultToUpdate, Boolean checked, List<ResponseResult> results,
			List<PerformanceResult> performances, Instant begin, Instant end) {
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
			stageResultToUpdate.getPerformances().removeIf(r -> r.getName().equals(performance.getName()));
			stageResultToUpdate.getPerformances().add(performance);
			isUpdated = true;
		}
		stageResultToUpdate.getResults().sort(Comparator.comparing(ResponseResult::getName));
		if (isUpdated)
			stageResultToUpdate.setChecked(false);

		if (isUpdated || Objects.nonNull(checked)) {
			var stageParam = Optional.ofNullable(stageParamService.getStageParamByStage(stageResultToUpdate.getStage()))
					.orElseThrow();
			stageResultToUpdate.setMissing((int) (stageParam.getQuestionParams().size()
					- stageResultToUpdate.getResults().stream().filter(r -> Objects.nonNull(r.getResultValue())).count()
					- stageResultToUpdate.getPerformances().stream()
							.filter(r -> Objects.nonNull(r.getPerformanceValue())).count()));
		}
		if (Objects.nonNull(checked)) {
			stageResultToUpdate.setChecked(checked);
			isUpdated = true;
		}
		return isUpdated;
	}

	private StageResult updateStageResultAndSave(StageResult stageResultToUpdate, Boolean checked,
			List<ResponseResult> results, List<PerformanceResult> performances, Instant begin, Instant end) {
		if (updateStageResult(stageResultToUpdate, checked, results, performances, begin, end))
			return save(stageResultToUpdate);
		return stageResultToUpdate;
	}
}
