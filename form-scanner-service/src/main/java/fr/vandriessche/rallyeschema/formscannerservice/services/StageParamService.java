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

import fr.vandriessche.rallyeschema.formscannerservice.entities.QuestionParam;
import fr.vandriessche.rallyeschema.formscannerservice.entities.QuestionPointParam;
import fr.vandriessche.rallyeschema.formscannerservice.entities.QuestionType;
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
		responseFileParam.getQuestions().values().stream().filter(q -> q.getType() == QuestionType.QUESTION)
				.forEach(q -> questionPointParams.putIfAbsent(q.getName(), new QuestionPointParam(q.getName(), 1l)));
		sortQuestionPointParams(stageParam);
		var questionParams = stageParam.getQuestionParams();
		responseFileParam.getQuestions().values().stream()
				.filter(q -> q.getType() == QuestionType.QUESTION || q.getType() == QuestionType.PERFORMANCE)
				.forEach(q -> {
					QuestionParam questionParam = questionParams.get(q.getName());
					if (Objects.isNull(questionParam)) {
						questionParam = new QuestionParam(q.getName(), q.getType(), false);
						questionParams.put(q.getName(), questionParam);
					} else {
						// le type ne peut pas etre different
						questionParam.setType(q.getType());
					}
				});
		sortQuestionParams(stageParam);
		stageParamRepository.save(stageParam);
	}

	public StageParam updateStageParam(StageParam stageParam) {
		StageParam stageParamToUpdate = Objects.nonNull(stageParam.getId())
				? stageParamRepository.findById(stageParam.getId()).orElseThrow()
				: stageParamRepository.findByStage(stageParam.getStage()).orElseThrow();
		return updateStageParam(stageParamToUpdate, stageParam.getQuestionPointParams().values(),
				stageParam.getQuestionParams().values());
	}

	private StageParam updateStageParam(StageParam stageParamToUpdate,
			Collection<QuestionPointParam> questionPointParams, Collection<QuestionParam> questionParams) {
		for (var questionPointParam : questionPointParams) {
			if (Objects.isNull(questionPointParam.getPoint())) {
				stageParamToUpdate.getQuestionPointParams().remove(questionPointParam.getName());
			} else {
				stageParamToUpdate.getQuestionPointParams().put(questionPointParam.getName(), questionPointParam);
			}
		}
		sortQuestionPointParams(stageParamToUpdate);
		for (var newQuestionParam : questionParams) {
			if (Objects.nonNull(newQuestionParam.getName())) {
				if (Objects.isNull(newQuestionParam.getType()) && Objects.isNull(newQuestionParam.getStaff())) {
					// on n'a ni de type ni de staff ca siginfie que l'on veut supprimer la question
					stageParamToUpdate.getQuestionParams().remove(newQuestionParam.getName());
				} else {
					var questionParam = stageParamToUpdate.getQuestionParams().get(newQuestionParam.getName());
					if (Objects.isNull(questionParam)) {
						stageParamToUpdate.getQuestionParams().put(newQuestionParam.getName(), newQuestionParam);
					} else {
						if (Objects.nonNull(newQuestionParam.getType()))
							questionParam.setType(newQuestionParam.getType());
						if (Objects.nonNull(newQuestionParam.getStaff()))
							questionParam.setStaff(newQuestionParam.getStaff());
					}
				}
			}
		}
		sortQuestionParams(stageParamToUpdate);
		stageParamToUpdate = stageParamRepository.save(stageParamToUpdate);
		return stageParamToUpdate;
	}

	private void sortQuestionPointParams(StageParam stageParam) {
		stageParam.setQuestionPointParams(
				stageParam.getQuestionPointParams().entrySet().stream().sorted(Map.Entry.comparingByKey())
						.collect(Collectors.toMap(Entry::getKey, Entry::getValue, (x, y) -> y, LinkedHashMap::new)));
	}

	private void sortQuestionParams(StageParam stageParam) {
		stageParam
				.setQuestionParams(stageParam.getQuestionParams().entrySet().stream().sorted(Map.Entry.comparingByKey())
						.collect(Collectors.toMap(Entry::getKey, Entry::getValue, (x, y) -> y, LinkedHashMap::new)));
	}
}
