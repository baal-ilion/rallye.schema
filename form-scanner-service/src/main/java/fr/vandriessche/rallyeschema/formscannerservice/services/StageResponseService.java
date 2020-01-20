package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.formscannerservice.entities.PerformanceResult;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResponse;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResponseSource;
import fr.vandriessche.rallyeschema.formscannerservice.message.StageResponseMessage;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.StageResponseRepository;

@Service
public class StageResponseService {
	public static final String STAGE_RESPONSE_CREATE_EVENT = "stageResponse.create";
	public static final String STAGE_RESPONSE_UPDATE_EVENT = "stageResponse.update";
	public static final String STAGE_RESPONSE_DELETE_EVENT = "stageResponse.delete";

	@Autowired
	private StageResponseRepository stageResponseRepository;

	@Autowired
	private MessageProducerService messageProducerService;

	public StageResponse addOrReplaceStageResponse(final StageResponse stageResponse) {
		if (Objects.nonNull(stageResponse.getId())) {
			stageResponseRepository.findById(stageResponse.getId()).orElseThrow();
		} else {
			stageResponseRepository.findByStageAndTeam(stageResponse.getStage(), stageResponse.getTeam())
					.ifPresent(s -> stageResponse.setId(s.getId()));
		}
		var stageResponse2 = stageResponseRepository.save(stageResponse);
		messageProducerService.sendMessage(
				Objects.nonNull(stageResponse.getId()) ? STAGE_RESPONSE_UPDATE_EVENT : STAGE_RESPONSE_CREATE_EVENT,
				new StageResponseMessage(stageResponse2));
		return stageResponse2;
	}

	public void deleteStageResponse(String id) {
		stageResponseRepository.findById(id).ifPresent(stageResponse -> {
			stageResponse = stageResponseRepository.save(stageResponse);
			messageProducerService.sendMessage(STAGE_RESPONSE_DELETE_EVENT, new StageResponseMessage(stageResponse));
		});
	}

	public List<PerformanceResult> getPerformanceResultFromStageResponse(StageResponse stageResponse) {
		StageResponseSource source = new StageResponseSource(stageResponse.getId(), null);
		if (Objects.nonNull(stageResponse.getPerformances())) {
			stageResponse.getPerformances().forEach(r -> r.setSource(source));
			return stageResponse.getPerformances();
		}
		return new ArrayList<>();
	}

	public List<ResponseResult> getResponseResultFromStageResponse(StageResponse stageResponse) {
		StageResponseSource source = new StageResponseSource(stageResponse.getId(), null);
		if (Objects.nonNull(stageResponse.getResults())) {
			stageResponse.getResults().forEach(r -> r.setSource(source));
			return stageResponse.getResults();
		}
		List<ResponseResult> results = new ArrayList<>();
		// TODO calcul des résultats à partir des réponses
		return results;
	}

	public StageResponse getStageResponse(String id) {
		return stageResponseRepository.findById(id).orElseThrow();
	}

	public StageResponse getStageResponseByStageAndTeam(Integer stage, Integer team) {
		return stageResponseRepository.findByStageAndTeam(stage, team).orElse(null);
	}

	public List<StageResponse> getStageResponses() {
		return stageResponseRepository.findAll();
	}
}
