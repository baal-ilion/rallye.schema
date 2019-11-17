package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.formscannerservice.entities.QuestionPageType;
import fr.vandriessche.rallyeschema.formscannerservice.entities.QuestionPointParam;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageParam;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.StageParamRepository;

@Service
public class StageParamService {
	@Autowired
	private StageParamRepository stageParamRepository;

	public StageParam getStageParam(String id) {
		return stageParamRepository.findById(id).orElseThrow();
	}

	public List<StageParam> getStageParams() {
		return stageParamRepository.findAll();
	}

	public StageParam getStageParamByStage(Integer stage) {
		return stageParamRepository.findByStage(stage).orElse(null);
	}

	public void updateResponseFileParams(ResponseFileParam responseFileParam) {
		StageParam stageParam = getStageParamByStage(responseFileParam.getStage());
		if (Objects.isNull(stageParam))
			stageParam = new StageParam(responseFileParam.getStage());
		stageParam.getResponseFileParams().removeIf(customer -> responseFileParam.getPage().equals(customer.getPage()));
		stageParam.getResponseFileParams().add(responseFileParam);
		stageParam.getResponseFileParams().sort(Comparator.comparing(ResponseFileParam::getPage));
		var questionPointParams = stageParam.getQuestionPointParams();
		responseFileParam.getQuestions().values().stream().filter(q -> q.getType() == QuestionPageType.QUESTION)
				.forEach(q -> questionPointParams.putIfAbsent(q.getName(), new QuestionPointParam(q.getName(), 1l)));
		stageParamRepository.save(stageParam);
	}

	public StageParam updateStageParam(StageParam stageParam) {
		StageParam stageParamToUpdate = Objects.nonNull(stageParam.getId())
				? stageParamRepository.findById(stageParam.getId()).orElseThrow()
				: stageParamRepository.findByStage(stageParam.getStage()).orElseThrow();
		return updateStageParam(stageParamToUpdate, stageParam.getQuestionPointParams().values());
	}

	private StageParam updateStageParam(StageParam stageParamToUpdate,
			Collection<QuestionPointParam> questionPointParams) {
		for (var questionPointParam : questionPointParams) {
			if (Objects.isNull(questionPointParam.getPoint())) {
				stageParamToUpdate.getQuestionPointParams().remove(questionPointParam.getName());
			} else {
				stageParamToUpdate.getQuestionPointParams().put(questionPointParam.getName(), questionPointParam);
			}
		}
		stageParamToUpdate.setQuestionPointParams(
				stageParamToUpdate.getQuestionPointParams().entrySet().stream().sorted(Map.Entry.comparingByKey())
						.collect(Collectors.toMap(Entry::getKey, Entry::getValue, (x, y) -> y, LinkedHashMap::new)));
		stageParamToUpdate = stageParamRepository.save(stageParamToUpdate);
		return stageParamToUpdate;
	}
}
