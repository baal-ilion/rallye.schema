package fr.vandriessche.rallyeschema.responseservice.services;

import java.text.Collator;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map.Entry;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.dao.OptimisticLockingFailureException;

import fr.vandriessche.rallyeschema.responseservice.entities.PerformancePointParam;
import fr.vandriessche.rallyeschema.responseservice.entities.QuestionParam;
import fr.vandriessche.rallyeschema.responseservice.entities.QuestionPointParam;
import fr.vandriessche.rallyeschema.responseservice.entities.QuestionType;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StagePoint;
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResponse;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileInfoRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.FormDesignRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageGroupRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageRankingRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageResponseRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageResultRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamPointRepository;
import lombok.extern.java.Log;

@Service
@Log
public class StageParamService {
	@Autowired
	private MongoTemplate mongoTemplate;

	@PostConstruct
	public void initializeMissingVersions() {
		mongoTemplate.updateMulti(
				Query.query(Criteria.where("version").exists(false)),
				Update.update("version", 0L), StageParam.class);
	}

	@Autowired
	private StageParamRepository stageParamRepository;

	@Autowired
	private StageGroupRepository stageGroupRepository;

	@Autowired
	private ResponseFileParamRepository responseFileParamRepository;

	@Autowired
	private FormDesignRepository formDesignRepository;

	@Autowired
	private ResponseFileInfoRepository responseFileInfoRepository;

	@Autowired
	private StageResponseRepository stageResponseRepository;

	@Autowired
	private StageResultRepository stageResultRepository;

	@Autowired
	private StageRankingRepository stageRankingRepository;

	@Autowired
	private TeamPointRepository teamPointRepository;

	@Autowired
	private ResponseFileParamService responseFileParamService;

	@Autowired
	@Lazy
	private ResponseFileService responseFileService;

	@Autowired
	private StageResponseService stageResponseService;

	@Autowired
	@Lazy
	private StageResultService stageResultService;

	@Autowired
	@Lazy
	private StageRankingService stageRankingService;

	@Autowired
	@Lazy
	private TeamPointService teamPointService;

	public StageParam addStageParam(StageParam stageParam) {
		return updateStageParam(new StageParam(), stageParam);
	}

	public void deleteStageParam(String id) {
		var stageParam = stageParamRepository.findById(id).orElseThrow();
		Integer stage = stageParam.getStage();

		stageParam.getResponseFileParams().forEach(
				responseFileParam -> responseFileParamService.deleteResponseFileParam(responseFileParam.getId()));
		formDesignRepository.deleteByStageParamId(id);

		// Nettoyage des données liées à l'épreuve
		try {
			responseFileService.deleteByStage(stage);
		} catch (Exception e) {
			log.warning("Erreur lors de la suppression des feuilles de réponses de l'épreuve " + stage + " : " + e.getMessage());
		}
		try {
			stageResponseService.deleteByStage(stage);
		} catch (Exception e) {
			log.warning("Erreur lors de la suppression des réponses saisies de l'épreuve " + stage + " : " + e.getMessage());
		}
		try {
			stageResultService.deleteByStage(stage);
		} catch (Exception e) {
			log.warning("Erreur lors de la suppression des résultats de l'épreuve " + stage + " : " + e.getMessage());
		}
		try {
			stageRankingService.deleteByStage(stage);
		} catch (Exception e) {
			log.warning("Erreur lors de la suppression du classement de l'épreuve " + stage + " : " + e.getMessage());
		}
		try {
			teamPointService.removeStage(stage);
		} catch (Exception e) {
			log.warning("Erreur lors du nettoyage des points d'équipe pour l'épreuve " + stage + " : " + e.getMessage());
		}

		stageParamRepository.deleteById(id);
	}

	public StageParam getStageParam(String id) {
		return sortDisplayParams(stageParamRepository.findById(id).orElseThrow());
	}

	public StageParam getStageParamByStage(Integer stage) {
		StageParam stageParam = stageParamRepository.findByStage(stage).orElse(null);
		return Objects.isNull(stageParam) ? null : sortDisplayParams(stageParam);
	}

	public List<StageParam> getStageParams() {
		return stageParamRepository.findAll().stream().map(this::sortDisplayParams).collect(Collectors.toList());
	}

	public void removeResponseFileParam(ResponseFileParam responseFileParam) {
		StageParam stageParam = getStageParamByStage(responseFileParam.getStage());
		if (stageParam.getResponseFileParams()
				.removeIf(customer -> responseFileParam.getId().equals(customer.getId()))) {
			stageParam.getResponseFileParams().sort(Comparator.comparing(ResponseFileParam::getPage));
			stageParamRepository.save(stageParam);
		}
	}

	public void updateResponseFileParams(ResponseFileParam responseFileParam) {
		StageParam stageParam = getStageParamByStage(responseFileParam.getStage());
		if (Objects.isNull(stageParam))
			stageParam = new StageParam(responseFileParam.getStage());
		stageParam.getResponseFileParams().removeIf(customer -> responseFileParam.getPage().equals(customer.getPage()));
		stageParam.getResponseFileParams().add(responseFileParam);
		stageParam.getResponseFileParams().sort(Comparator.comparing(ResponseFileParam::getPage));
		initalisePointParam(stageParam, responseFileParam.getQuestions().values().stream().map(q -> (QuestionParam) q));
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
		ensureCurrentVersion(stageParamToUpdate, stageParam);
		return updateStageParam(stageParamToUpdate, stageParam);
	}

	private void ensureCurrentVersion(StageParam current, StageParam requested) {
		if (requested.getVersion() != null && !Objects.equals(current.getVersion(), requested.getVersion())) {
			throw new OptimisticLockingFailureException(
					"L'\u00e9preuve a \u00e9t\u00e9 modifi\u00e9e depuis son chargement.");
		}
	}

	public StageParam updateOrCreateStageParam(StageParam stageParam) {
		StageParam stageParamToUpdate = Objects.nonNull(stageParam.getId())
				? stageParamRepository.findById(stageParam.getId()).orElseThrow()
				: stageParamRepository.findByStage(stageParam.getStage()).orElse(null);
		if (Objects.nonNull(stageParamToUpdate))
			return updateStageParam(stageParamToUpdate, stageParam);
		else
			return updateStageParam(new StageParam(), stageParam);
	}

	private void removePerformancePointParam(StageParam stageParamToUpdate, String performanceName) {
		stageParamToUpdate.getPerformancePointParams().remove(performanceName);
	}

	private void removeQuestionPointParam(StageParam stageParamToUpdate, String questionName) {
		stageParamToUpdate.getQuestionPointParams().remove(questionName);
	}

	private void sortPerformancePointParams(StageParam stageParam) {
		stageParam.setPerformancePointParams(
				stageParam.getPerformancePointParams().entrySet().stream()
						.sorted((left, right) -> compareLabels(left.getKey(), right.getKey()))
						.collect(Collectors.toMap(Entry::getKey, Entry::getValue, (x, y) -> y, LinkedHashMap::new)));
	}

	private void sortQuestionParams(StageParam stageParam) {
		stageParam
				.setQuestionParams(stageParam.getQuestionParams().entrySet().stream()
						.sorted((left, right) -> compareLabels(left.getKey(), right.getKey()))
						.collect(Collectors.toMap(Entry::getKey, Entry::getValue, (x, y) -> y, LinkedHashMap::new)));
	}

	private void sortQuestionPointParams(StageParam stageParam) {
		stageParam.setQuestionPointParams(
				stageParam.getQuestionPointParams().entrySet().stream()
						.sorted((left, right) -> compareLabels(left.getKey(), right.getKey()))
						.collect(Collectors.toMap(Entry::getKey, Entry::getValue, (x, y) -> y, LinkedHashMap::new)));
	}

	private StageParam sortDisplayParams(StageParam stageParam) {
		sortQuestionParams(stageParam);
		sortQuestionPointParams(stageParam);
		sortPerformancePointParams(stageParam);
		return stageParam;
	}

	private int compareLabels(String left, String right) {
		Collator collator = Collator.getInstance(Locale.FRENCH);
		collator.setStrength(Collator.PRIMARY);
		int leftIndex = 0;
		int rightIndex = 0;
		while (leftIndex < left.length() && rightIndex < right.length()) {
			boolean leftDigit = Character.isDigit(left.charAt(leftIndex));
			boolean rightDigit = Character.isDigit(right.charAt(rightIndex));
			int leftEnd = nextChunkEnd(left, leftIndex, leftDigit);
			int rightEnd = nextChunkEnd(right, rightIndex, rightDigit);
			String leftChunk = left.substring(leftIndex, leftEnd);
			String rightChunk = right.substring(rightIndex, rightEnd);
			int comparison;
			if (leftDigit && rightDigit) {
				String normalizedLeft = leftChunk.replaceFirst("^0+(?!$)", "");
				String normalizedRight = rightChunk.replaceFirst("^0+(?!$)", "");
				comparison = Integer.compare(normalizedLeft.length(), normalizedRight.length());
				if (comparison == 0)
					comparison = normalizedLeft.compareTo(normalizedRight);
			} else {
				comparison = collator.compare(leftChunk, rightChunk);
			}
			if (comparison != 0)
				return comparison;
			leftIndex = leftEnd;
			rightIndex = rightEnd;
		}
		return Integer.compare(left.length(), right.length());
	}

	private int nextChunkEnd(String value, int start, boolean digit) {
		int index = start + 1;
		while (index < value.length() && Character.isDigit(value.charAt(index)) == digit)
			index++;
		return index;
	}

	private void updatePerformancePointParams(StageParam stageParamToUpdate,
			Collection<PerformancePointParam> performancePointParams) {
		for (var performancePointParam : performancePointParams) {
			performancePointParam.getRanges().removeIf(range -> Objects.isNull(range.getPoint())
					&& (Objects.isNull(range.getExpression()) || range.getExpression().isBlank()));
			if (performancePointParam.getRanges().isEmpty()) {
				removePerformancePointParam(stageParamToUpdate, performancePointParam.getName());
			} else {
				stageParamToUpdate.getPerformancePointParams().put(performancePointParam.getName(),
						performancePointParam);
			}
		}
		sortPerformancePointParams(stageParamToUpdate);
	}

	private void updateQuestionParam(StageParam stageParamToUpdate, QuestionParam questionParam) {
		var questionParamToUpdate = stageParamToUpdate.getQuestionParams().get(questionParam.getName());
		if (Objects.isNull(questionParamToUpdate)) {
			stageParamToUpdate.getQuestionParams().put(questionParam.getName(), questionParam);
			initalisePointParam(stageParamToUpdate, Stream.of(questionParam));
		} else {
			if (Objects.nonNull(questionParam.getType())
					&& !questionParam.getType().equals(questionParamToUpdate.getType())) {
				if (questionParam.getType() == QuestionType.PERFORMANCE)
					removeQuestionPointParam(stageParamToUpdate, questionParam.getName());
				else
					removePerformancePointParam(stageParamToUpdate, questionParam.getName());
				questionParamToUpdate.setType(questionParam.getType());
				initalisePointParam(stageParamToUpdate, Stream.of(questionParamToUpdate));
			}
			if (Objects.nonNull(questionParam.getManagedByOrganizer()))
				questionParamToUpdate.setManagedByOrganizer(questionParam.getManagedByOrganizer());
		}
	}

	class ToSort {
		public boolean sortQuestionPointParams = false;
		public boolean sortPerformancePointParams = false;
	}

	private void initalisePointParam(StageParam stageParamToUpdate, Stream<QuestionParam> questionParams) {
		final ToSort toSort = new ToSort();
		questionParams.forEach(questionParam -> {
			if (questionParam.getType() == QuestionType.QUESTION) {
				stageParamToUpdate.getQuestionPointParams().putIfAbsent(questionParam.getName(),
						new QuestionPointParam(questionParam.getName(), 1l));
				toSort.sortQuestionPointParams = true;
			} else if (questionParam.getType() == QuestionType.PERFORMANCE) {
				stageParamToUpdate.getPerformancePointParams().putIfAbsent(questionParam.getName(),
						new PerformancePointParam(questionParam.getName(), 1l));
				toSort.sortPerformancePointParams = true;
			}
		});
		if (toSort.sortQuestionPointParams)
			sortQuestionPointParams(stageParamToUpdate);
		if (toSort.sortPerformancePointParams)
			sortPerformancePointParams(stageParamToUpdate);
	}

	private void updateQuestionParams(StageParam stageParamToUpdate, Collection<QuestionParam> questionParams) {
		for (var questionParam : questionParams) {
			if (Objects.nonNull(questionParam.getName())) {
				if (Objects.isNull(questionParam.getType())
						&& Objects.isNull(questionParam.getManagedByOrganizer())) {
					// Sans type ni mode de gestion, le patch demande la suppression de la question.
					stageParamToUpdate.getQuestionParams().remove(questionParam.getName());
					removeQuestionPointParam(stageParamToUpdate, questionParam.getName());
					removePerformancePointParam(stageParamToUpdate, questionParam.getName());
				} else {
					updateQuestionParam(stageParamToUpdate, questionParam);
				}
			}
		}
		sortQuestionParams(stageParamToUpdate);
	}

	private void updateQuestionPointParams(StageParam stageParamToUpdate,
			Collection<QuestionPointParam> questionPointParams) {
		for (var questionPointParam : questionPointParams) {
			if (Objects.isNull(questionPointParam.getPoint())) {
				removeQuestionPointParam(stageParamToUpdate, questionPointParam.getName());
			} else {
				stageParamToUpdate.getQuestionPointParams().put(questionPointParam.getName(), questionPointParam);
			}
		}
		sortQuestionPointParams(stageParamToUpdate);
	}

	private StageParam updateStageParam(StageParam stageParamToUpdate, StageParam stageParam) {
		Integer previousStage = stageParamToUpdate.getStage();
		Integer nextStage = stageParam.getStage();
		boolean stageChanged = Objects.nonNull(nextStage) && !nextStage.equals(previousStage);
		if (stageChanged) {
			ensureTargetStageHasNoDependentData(nextStage);
		}
		updateStageParamData(stageParamToUpdate, stageParam);
		updateQuestionParams(stageParamToUpdate, stageParam.getQuestionParams().values());
		updateQuestionPointParams(stageParamToUpdate, stageParam.getQuestionPointParams().values());
		updatePerformancePointParams(stageParamToUpdate, stageParam.getPerformancePointParams().values());
		stageParamToUpdate = stageParamRepository.save(stageParamToUpdate);
		if (stageChanged) {
			migrateStageNumber(stageParamToUpdate, previousStage, nextStage);
		}
		return stageParamToUpdate;
	}

	private void ensureTargetStageHasNoDependentData(Integer nextStage) {
		if (!responseFileParamRepository.findByStage(nextStage).isEmpty()
				|| !responseFileInfoRepository.findByStage(nextStage).isEmpty()
				|| !stageResponseRepository.findByStage(nextStage).isEmpty()
				|| !stageResultRepository.findByStage(nextStage).isEmpty()
				|| stageRankingRepository.findByStage(nextStage).isPresent()
				|| teamPointRepository.findAll().stream()
						.anyMatch(teamPoint -> teamPoint.getStagePoints().containsKey(nextStage))) {
			throw new IllegalArgumentException(
					"Le num\u00e9ro d'\u00e9preuve " + nextStage + " est d\u00e9j\u00e0 utilis\u00e9 par des donn\u00e9es li\u00e9es.");
		}
	}

	private void migrateStageNumber(StageParam stageParamToUpdate, Integer previousStage, Integer nextStage) {
		if (Objects.isNull(previousStage) || Objects.isNull(nextStage) || previousStage.equals(nextStage)) {
			return;
		}

		stageParamToUpdate.getResponseFileParams().forEach(responseFileParam -> responseFileParam.setStage(nextStage));
		migrateResponseFileParams(previousStage, nextStage);
		migrateResponseFileInfos(previousStage, nextStage);
		migrateStageResponses(previousStage, nextStage);
		migrateStageResults(previousStage, nextStage);
		migrateStageRanking(previousStage, nextStage);
		migrateTeamPoints(previousStage, nextStage);
	}

	private void migrateResponseFileParams(Integer previousStage, Integer nextStage) {
		for (ResponseFileParam responseFileParam : responseFileParamRepository.findByStage(previousStage)) {
			responseFileParam.setStage(nextStage);
			responseFileParamRepository.save(responseFileParam);
		}
	}

	private void migrateResponseFileInfos(Integer previousStage, Integer nextStage) {
		for (ResponseFileInfo responseFileInfo : responseFileInfoRepository.findByStage(previousStage)) {
			responseFileInfo.setStage(nextStage);
			responseFileInfoRepository.save(responseFileInfo);
		}
	}

	private void migrateStageResponses(Integer previousStage, Integer nextStage) {
		for (StageResponse stageResponse : stageResponseRepository.findByStage(previousStage)) {
			stageResponse.setStage(nextStage);
			stageResponseRepository.save(stageResponse);
		}
	}

	private void migrateStageResults(Integer previousStage, Integer nextStage) {
		for (StageResult stageResult : stageResultRepository.findByStage(previousStage)) {
			stageResult.setStage(nextStage);
			stageResultRepository.save(stageResult);
		}
	}

	private void migrateStageRanking(Integer previousStage, Integer nextStage) {
		stageRankingRepository.findByStage(previousStage).ifPresent(stageRanking -> {
			stageRanking.setStage(nextStage);
			stageRankingRepository.save(stageRanking);
		});
	}

	private void migrateTeamPoints(Integer previousStage, Integer nextStage) {
		for (TeamPoint teamPoint : teamPointRepository.findAll()) {
			StagePoint stagePoint = teamPoint.getStagePoints().remove(previousStage);
			if (Objects.nonNull(stagePoint)) {
				stagePoint.setStage(nextStage);
				teamPoint.getStagePoints().put(nextStage, stagePoint);
				teamPointRepository.save(teamPoint);
			}
		}
	}

	private void updateStageParamData(StageParam stageParamToUpdate, StageParam stageParam) {
        // Update stage number if provided and different
        if (Objects.nonNull(stageParam.getStage())
                && !stageParam.getStage().equals(stageParamToUpdate.getStage())) {
            stageParamRepository.findByStage(stageParam.getStage())
                    .filter(existing -> !existing.getId().equals(stageParamToUpdate.getId()))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException(
                                "Le num\u00e9ro d'\u00e9preuve " + stageParam.getStage() + " est d\u00e9j\u00e0 utilis\u00e9.");
                    });
            stageParamToUpdate.setStage(stageParam.getStage());
        }

        if (Objects.nonNull(stageParam.getName())) {
            stageParamToUpdate.setName(stageParam.getName());
        }

        // Handle group attachment
        if (stageParam.getGroup() == null) {
            // User chose "Aucun groupe"
            stageParamToUpdate.setGroup(null);
        } else if (stageParam.getGroup().getId() != null) {
            var group = stageGroupRepository.findById(stageParam.getGroup().getId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Groupe d'\u00e9preuves introuvable (id=" + stageParam.getGroup().getId() + ")."));
            stageParamToUpdate.setGroup(group);
        } else if (stageParam.getGroup().getName() != null) {
            var group = stageGroupRepository.findByName(stageParam.getGroup().getName())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Groupe d'\u00e9preuves introuvable (nom=" + stageParam.getGroup().getName() + ")."));
            stageParamToUpdate.setGroup(group);
        } else {
            stageParamToUpdate.setGroup(null);
        }
    }
}

