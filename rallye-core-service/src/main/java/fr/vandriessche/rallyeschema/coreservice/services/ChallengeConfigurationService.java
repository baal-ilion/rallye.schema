package fr.vandriessche.rallyeschema.coreservice.services;

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

import fr.vandriessche.rallyeschema.coreservice.entities.PerformanceScoring;
import fr.vandriessche.rallyeschema.coreservice.entities.QuestionDefinition;
import fr.vandriessche.rallyeschema.coreservice.entities.QuestionScoring;
import fr.vandriessche.rallyeschema.coreservice.entities.QuestionType;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;
import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengePoint;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.coreservice.repositories.SubmittedFormMetadataRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormRecognitionConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormDesignRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeGroupRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeRankingRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResponseRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResultRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamPointRepository;
import lombok.extern.java.Log;

@Service
@Log
public class ChallengeConfigurationService {
	@Autowired
	private MongoTemplate mongoTemplate;

	@PostConstruct
	public void initializeMissingVersions() {
		mongoTemplate.updateMulti(
				Query.query(Criteria.where("version").exists(false)),
				Update.update("version", 0L), ChallengeConfiguration.class);
	}

	@Autowired
	private ChallengeConfigurationRepository challengeConfigurationRepository;

	@Autowired
	private ChallengeGroupRepository challengeGroupRepository;

	@Autowired
	private FormRecognitionConfigurationRepository formRecognitionConfigurationRepository;

	@Autowired
	private FormDesignRepository formDesignRepository;

	@Autowired
	private SubmittedFormMetadataRepository submittedFormMetadataRepository;

	@Autowired
	private ChallengeResponseRepository challengeResponseRepository;

	@Autowired
	private ChallengeResultRepository challengeResultRepository;

	@Autowired
	private ChallengeRankingRepository challengeRankingRepository;

	@Autowired
	private TeamPointRepository teamPointRepository;

	@Autowired
	private FormRecognitionConfigurationService formRecognitionConfigurationService;

	@Autowired
	@Lazy
	private SubmittedFormService submittedFormService;

	@Autowired
	private ChallengeResponseService challengeResponseService;

	@Autowired
	@Lazy
	private ChallengeResultService challengeResultService;

	@Autowired
	@Lazy
	private ChallengeRankingService challengeRankingService;

	@Autowired
	@Lazy
	private TeamPointService teamPointService;

	@Autowired
	private RankingUpdatePublisher rankingUpdatePublisher;

	public ChallengeConfiguration addChallengeConfiguration(ChallengeConfiguration challengeConfiguration) {
		return updateChallengeConfiguration(new ChallengeConfiguration(), challengeConfiguration);
	}

	public void deleteChallengeConfiguration(String id) {
		var challengeConfiguration = challengeConfigurationRepository.findById(id).orElseThrow();
		Integer challenge = challengeConfiguration.getChallenge();

		challengeConfiguration.getFormRecognitionConfigurations().forEach(
				formRecognitionConfiguration -> formRecognitionConfigurationService.deleteFormRecognitionConfiguration(formRecognitionConfiguration.getId()));
		formDesignRepository.deleteByChallengeConfigurationId(id);

		// Nettoyage des données liées à l'épreuve
		try {
			submittedFormService.deleteByChallenge(challenge);
		} catch (Exception e) {
			log.warning("Erreur lors de la suppression des feuilles de réponses de l'épreuve " + challenge + " : " + e.getMessage());
		}
		try {
			challengeResponseService.deleteByChallenge(challenge);
		} catch (Exception e) {
			log.warning("Erreur lors de la suppression des réponses saisies de l'épreuve " + challenge + " : " + e.getMessage());
		}
		try {
			challengeResultService.deleteByChallenge(challenge);
		} catch (Exception e) {
			log.warning("Erreur lors de la suppression des résultats de l'épreuve " + challenge + " : " + e.getMessage());
		}
		try {
			challengeRankingService.deleteByChallenge(challenge);
		} catch (Exception e) {
			log.warning("Erreur lors de la suppression du classement de l'épreuve " + challenge + " : " + e.getMessage());
		}
		try {
			teamPointService.removeChallenge(challenge);
		} catch (Exception e) {
			log.warning("Erreur lors du nettoyage des points d'équipe pour l'épreuve " + challenge + " : " + e.getMessage());
		}

		challengeConfigurationRepository.deleteById(id);
	}

	public ChallengeConfiguration getChallengeConfiguration(String id) {
		return sortDisplayConfiguration(challengeConfigurationRepository.findById(id).orElseThrow());
	}

	public ChallengeConfiguration getChallengeConfigurationByChallenge(Integer challenge) {
		ChallengeConfiguration challengeConfiguration = challengeConfigurationRepository.findByChallenge(challenge).orElse(null);
		return Objects.isNull(challengeConfiguration) ? null : sortDisplayConfiguration(challengeConfiguration);
	}

	public List<ChallengeConfiguration> getChallengeConfigurations() {
		return challengeConfigurationRepository.findAll().stream().map(this::sortDisplayConfiguration).collect(Collectors.toList());
	}

	public void removeFormRecognitionConfiguration(FormRecognitionConfiguration formRecognitionConfiguration) {
		ChallengeConfiguration challengeConfiguration = getChallengeConfigurationByChallenge(formRecognitionConfiguration.getChallenge());
		if (challengeConfiguration.getFormRecognitionConfigurations()
				.removeIf(customer -> formRecognitionConfiguration.getId().equals(customer.getId()))) {
			challengeConfiguration.getFormRecognitionConfigurations().sort(Comparator.comparing(FormRecognitionConfiguration::getPage));
			challengeConfigurationRepository.save(challengeConfiguration);
		}
	}

	public void updateFormRecognitionConfigurations(FormRecognitionConfiguration formRecognitionConfiguration) {
		ChallengeConfiguration challengeConfiguration = getChallengeConfigurationByChallenge(formRecognitionConfiguration.getChallenge());
		if (Objects.isNull(challengeConfiguration))
			challengeConfiguration = new ChallengeConfiguration(formRecognitionConfiguration.getChallenge());
		challengeConfiguration.getFormRecognitionConfigurations().removeIf(customer -> formRecognitionConfiguration.getPage().equals(customer.getPage()));
		challengeConfiguration.getFormRecognitionConfigurations().add(formRecognitionConfiguration);
		challengeConfiguration.getFormRecognitionConfigurations().sort(Comparator.comparing(FormRecognitionConfiguration::getPage));
		initializeQuestionScoring(challengeConfiguration, formRecognitionConfiguration.getQuestions().values().stream().map(q -> (QuestionDefinition) q));
		var questionDefinitions = challengeConfiguration.getQuestionDefinitions();
		formRecognitionConfiguration.getQuestions().values().stream()
				.filter(q -> q.getType() == QuestionType.QUESTION || q.getType() == QuestionType.PERFORMANCE)
				.forEach(q -> {
					QuestionDefinition questionDefinition = questionDefinitions.get(q.getName());
					if (Objects.isNull(questionDefinition)) {
						questionDefinition = new QuestionDefinition(q.getName(), q.getType(), false);
						questionDefinitions.put(q.getName(), questionDefinition);
					} else {
						// le type ne peut pas etre different
						questionDefinition.setType(q.getType());
					}
				});
		sortQuestionDefinitions(challengeConfiguration);
		challengeConfigurationRepository.save(challengeConfiguration);
	}

	public ChallengeConfiguration updateChallengeConfiguration(ChallengeConfiguration challengeConfiguration) {
		ChallengeConfiguration challengeConfigurationToUpdate = Objects.nonNull(challengeConfiguration.getId())
				? challengeConfigurationRepository.findById(challengeConfiguration.getId()).orElseThrow()
				: challengeConfigurationRepository.findByChallenge(challengeConfiguration.getChallenge()).orElseThrow();
		ensureCurrentVersion(challengeConfigurationToUpdate, challengeConfiguration);
		return updateChallengeConfiguration(challengeConfigurationToUpdate, challengeConfiguration);
	}

	private void ensureCurrentVersion(ChallengeConfiguration current, ChallengeConfiguration requested) {
		if (requested.getVersion() != null && !Objects.equals(current.getVersion(), requested.getVersion())) {
			throw new OptimisticLockingFailureException(
					"L'\u00e9preuve a \u00e9t\u00e9 modifi\u00e9e depuis son chargement.");
		}
	}

	public ChallengeConfiguration updateOrCreateChallengeConfiguration(ChallengeConfiguration challengeConfiguration) {
		ChallengeConfiguration challengeConfigurationToUpdate = Objects.nonNull(challengeConfiguration.getId())
				? challengeConfigurationRepository.findById(challengeConfiguration.getId()).orElseThrow()
				: challengeConfigurationRepository.findByChallenge(challengeConfiguration.getChallenge()).orElse(null);
		if (Objects.nonNull(challengeConfigurationToUpdate))
			return updateChallengeConfiguration(challengeConfigurationToUpdate, challengeConfiguration);
		else
			return updateChallengeConfiguration(new ChallengeConfiguration(), challengeConfiguration);
	}

	private void removePerformanceScoring(ChallengeConfiguration challengeConfigurationToUpdate, String performanceName) {
		challengeConfigurationToUpdate.getPerformanceScorings().remove(performanceName);
	}

	private void removeQuestionScoring(ChallengeConfiguration challengeConfigurationToUpdate, String questionName) {
		challengeConfigurationToUpdate.getQuestionScorings().remove(questionName);
	}

	private void sortPerformanceScorings(ChallengeConfiguration challengeConfiguration) {
		challengeConfiguration.setPerformanceScorings(
				challengeConfiguration.getPerformanceScorings().entrySet().stream()
						.sorted((left, right) -> compareLabels(left.getKey(), right.getKey()))
						.collect(Collectors.toMap(Entry::getKey, Entry::getValue, (x, y) -> y, LinkedHashMap::new)));
	}

	private void sortQuestionDefinitions(ChallengeConfiguration challengeConfiguration) {
		challengeConfiguration
				.setQuestionDefinitions(challengeConfiguration.getQuestionDefinitions().entrySet().stream()
						.sorted((left, right) -> compareLabels(left.getKey(), right.getKey()))
						.collect(Collectors.toMap(Entry::getKey, Entry::getValue, (x, y) -> y, LinkedHashMap::new)));
	}

	private void sortQuestionScorings(ChallengeConfiguration challengeConfiguration) {
		challengeConfiguration.setQuestionScorings(
				challengeConfiguration.getQuestionScorings().entrySet().stream()
						.sorted((left, right) -> compareLabels(left.getKey(), right.getKey()))
						.collect(Collectors.toMap(Entry::getKey, Entry::getValue, (x, y) -> y, LinkedHashMap::new)));
	}

	private ChallengeConfiguration sortDisplayConfiguration(ChallengeConfiguration challengeConfiguration) {
		sortQuestionDefinitions(challengeConfiguration);
		sortQuestionScorings(challengeConfiguration);
		sortPerformanceScorings(challengeConfiguration);
		return challengeConfiguration;
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

	private void updatePerformanceScorings(ChallengeConfiguration challengeConfigurationToUpdate,
			Collection<PerformanceScoring> performanceScorings) {
		for (var performanceScoring : performanceScorings) {
			performanceScoring.getRanges().removeIf(range -> Objects.isNull(range.getPoint())
					&& (Objects.isNull(range.getExpression()) || range.getExpression().isBlank()));
			if (performanceScoring.getRanges().isEmpty()) {
				removePerformanceScoring(challengeConfigurationToUpdate, performanceScoring.getName());
			} else {
				challengeConfigurationToUpdate.getPerformanceScorings().put(performanceScoring.getName(),
						performanceScoring);
			}
		}
		sortPerformanceScorings(challengeConfigurationToUpdate);
	}

	private void updateQuestionDefinition(ChallengeConfiguration challengeConfigurationToUpdate, QuestionDefinition questionDefinition) {
		var questionDefinitionToUpdate = challengeConfigurationToUpdate.getQuestionDefinitions().get(questionDefinition.getName());
		if (Objects.isNull(questionDefinitionToUpdate)) {
			challengeConfigurationToUpdate.getQuestionDefinitions().put(questionDefinition.getName(), questionDefinition);
			initializeQuestionScoring(challengeConfigurationToUpdate, Stream.of(questionDefinition));
		} else {
			if (Objects.nonNull(questionDefinition.getType())
					&& !questionDefinition.getType().equals(questionDefinitionToUpdate.getType())) {
				if (questionDefinition.getType() == QuestionType.PERFORMANCE)
					removeQuestionScoring(challengeConfigurationToUpdate, questionDefinition.getName());
				else
					removePerformanceScoring(challengeConfigurationToUpdate, questionDefinition.getName());
				questionDefinitionToUpdate.setType(questionDefinition.getType());
				initializeQuestionScoring(challengeConfigurationToUpdate, Stream.of(questionDefinitionToUpdate));
			}
			if (Objects.nonNull(questionDefinition.getManagedByOrganizer()))
				questionDefinitionToUpdate.setManagedByOrganizer(questionDefinition.getManagedByOrganizer());
		}
	}

	class ToSort {
		public boolean sortQuestionScorings = false;
		public boolean sortPerformanceScorings = false;
	}

	private void initializeQuestionScoring(ChallengeConfiguration challengeConfigurationToUpdate, Stream<QuestionDefinition> questionDefinitions) {
		final ToSort toSort = new ToSort();
		questionDefinitions.forEach(questionDefinition -> {
			if (questionDefinition.getType() == QuestionType.QUESTION) {
				challengeConfigurationToUpdate.getQuestionScorings().putIfAbsent(questionDefinition.getName(),
						new QuestionScoring(questionDefinition.getName(), 1l));
				toSort.sortQuestionScorings = true;
			} else if (questionDefinition.getType() == QuestionType.PERFORMANCE) {
				challengeConfigurationToUpdate.getPerformanceScorings().putIfAbsent(questionDefinition.getName(),
						new PerformanceScoring(questionDefinition.getName(), 1l));
				toSort.sortPerformanceScorings = true;
			}
		});
		if (toSort.sortQuestionScorings)
			sortQuestionScorings(challengeConfigurationToUpdate);
		if (toSort.sortPerformanceScorings)
			sortPerformanceScorings(challengeConfigurationToUpdate);
	}

	private void updateQuestionDefinitions(ChallengeConfiguration challengeConfigurationToUpdate, Collection<QuestionDefinition> questionDefinitions) {
		for (var questionDefinition : questionDefinitions) {
			if (Objects.nonNull(questionDefinition.getName())) {
				if (Objects.isNull(questionDefinition.getType())
						&& Objects.isNull(questionDefinition.getManagedByOrganizer())) {
					// Sans type ni mode de gestion, le patch demande la suppression de la question.
					challengeConfigurationToUpdate.getQuestionDefinitions().remove(questionDefinition.getName());
					removeQuestionScoring(challengeConfigurationToUpdate, questionDefinition.getName());
					removePerformanceScoring(challengeConfigurationToUpdate, questionDefinition.getName());
				} else {
					updateQuestionDefinition(challengeConfigurationToUpdate, questionDefinition);
				}
			}
		}
		sortQuestionDefinitions(challengeConfigurationToUpdate);
	}

	private void updateQuestionScorings(ChallengeConfiguration challengeConfigurationToUpdate,
			Collection<QuestionScoring> questionScorings) {
		for (var questionScoring : questionScorings) {
			if (Objects.isNull(questionScoring.getPoint())) {
				removeQuestionScoring(challengeConfigurationToUpdate, questionScoring.getName());
			} else {
				challengeConfigurationToUpdate.getQuestionScorings().put(questionScoring.getName(), questionScoring);
			}
		}
		sortQuestionScorings(challengeConfigurationToUpdate);
	}

	private ChallengeConfiguration updateChallengeConfiguration(ChallengeConfiguration challengeConfigurationToUpdate, ChallengeConfiguration challengeConfiguration) {
		Integer previousChallenge = challengeConfigurationToUpdate.getChallenge();
		Integer nextChallenge = challengeConfiguration.getChallenge();
		LinkedHashMap<String, QuestionScoring> previousQuestionScorings = new LinkedHashMap<>(challengeConfigurationToUpdate.getQuestionScorings());
		LinkedHashMap<String, PerformanceScoring> previousPerformanceScorings = new LinkedHashMap<>(challengeConfigurationToUpdate.getPerformanceScorings());
		boolean challengeChanged = Objects.nonNull(nextChallenge) && !nextChallenge.equals(previousChallenge);
		if (challengeChanged) {
			ensureTargetChallengeHasNoDependentData(nextChallenge);
		}
		updateChallengeConfigurationData(challengeConfigurationToUpdate, challengeConfiguration);
		updateQuestionDefinitions(challengeConfigurationToUpdate, challengeConfiguration.getQuestionDefinitions().values());
		updateQuestionScorings(challengeConfigurationToUpdate, challengeConfiguration.getQuestionScorings().values());
		updatePerformanceScorings(challengeConfigurationToUpdate, challengeConfiguration.getPerformanceScorings().values());
		boolean scoringChanged = !previousQuestionScorings.equals(challengeConfigurationToUpdate.getQuestionScorings())
				|| !previousPerformanceScorings.equals(challengeConfigurationToUpdate.getPerformanceScorings());
		challengeConfigurationToUpdate = challengeConfigurationRepository.save(challengeConfigurationToUpdate);
		if (challengeChanged) {
			migrateChallengeNumber(challengeConfigurationToUpdate, previousChallenge, nextChallenge);
		}
		if (scoringChanged) {
			recomputeAllPointsAndNotify();
		}
		return challengeConfigurationToUpdate;
	}

	private void recomputeAllPointsAndNotify() {
		challengeRankingService.computeAllChallengeRanking();
		teamPointService.computeTeamPoints();
		rankingUpdatePublisher.publishRankingUpdate();
	}

	private void ensureTargetChallengeHasNoDependentData(Integer nextChallenge) {
		if (!formRecognitionConfigurationRepository.findByChallenge(nextChallenge).isEmpty()
				|| !submittedFormMetadataRepository.findByChallenge(nextChallenge).isEmpty()
				|| !challengeResponseRepository.findByChallenge(nextChallenge).isEmpty()
				|| !challengeResultRepository.findByChallenge(nextChallenge).isEmpty()
				|| challengeRankingRepository.findByChallenge(nextChallenge).isPresent()
				|| teamPointRepository.findAll().stream()
						.anyMatch(teamPoint -> teamPoint.getChallengePoints().containsKey(nextChallenge))) {
			throw new IllegalArgumentException(
					"Le num\u00e9ro d'\u00e9preuve " + nextChallenge + " est d\u00e9j\u00e0 utilis\u00e9 par des donn\u00e9es li\u00e9es.");
		}
	}

	private void migrateChallengeNumber(ChallengeConfiguration challengeConfigurationToUpdate, Integer previousChallenge, Integer nextChallenge) {
		if (Objects.isNull(previousChallenge) || Objects.isNull(nextChallenge) || previousChallenge.equals(nextChallenge)) {
			return;
		}

		challengeConfigurationToUpdate.getFormRecognitionConfigurations().forEach(formRecognitionConfiguration -> formRecognitionConfiguration.setChallenge(nextChallenge));
		migrateFormRecognitionConfigurations(previousChallenge, nextChallenge);
		migrateSubmittedFormMetadatas(previousChallenge, nextChallenge);
		migrateChallengeResponses(previousChallenge, nextChallenge);
		migrateChallengeResults(previousChallenge, nextChallenge);
		migrateChallengeRanking(previousChallenge, nextChallenge);
		migrateTeamPoints(previousChallenge, nextChallenge);
	}

	private void migrateFormRecognitionConfigurations(Integer previousChallenge, Integer nextChallenge) {
		for (FormRecognitionConfiguration formRecognitionConfiguration : formRecognitionConfigurationRepository.findByChallenge(previousChallenge)) {
			formRecognitionConfiguration.setChallenge(nextChallenge);
			formRecognitionConfigurationRepository.save(formRecognitionConfiguration);
		}
	}

	private void migrateSubmittedFormMetadatas(Integer previousChallenge, Integer nextChallenge) {
		for (SubmittedFormMetadata submittedFormMetadata : submittedFormMetadataRepository.findByChallenge(previousChallenge)) {
			submittedFormMetadata.setChallenge(nextChallenge);
			submittedFormMetadataRepository.save(submittedFormMetadata);
		}
	}

	private void migrateChallengeResponses(Integer previousChallenge, Integer nextChallenge) {
		for (ChallengeResponse challengeResponse : challengeResponseRepository.findByChallenge(previousChallenge)) {
			challengeResponse.setChallenge(nextChallenge);
			challengeResponseRepository.save(challengeResponse);
		}
	}

	private void migrateChallengeResults(Integer previousChallenge, Integer nextChallenge) {
		for (ChallengeResult challengeResult : challengeResultRepository.findByChallenge(previousChallenge)) {
			challengeResult.setChallenge(nextChallenge);
			challengeResultRepository.save(challengeResult);
		}
	}

	private void migrateChallengeRanking(Integer previousChallenge, Integer nextChallenge) {
		challengeRankingRepository.findByChallenge(previousChallenge).ifPresent(challengeRanking -> {
			challengeRanking.setChallenge(nextChallenge);
			challengeRankingRepository.save(challengeRanking);
		});
	}

	private void migrateTeamPoints(Integer previousChallenge, Integer nextChallenge) {
		for (TeamPoint teamPoint : teamPointRepository.findAll()) {
			ChallengePoint challengePoint = teamPoint.getChallengePoints().remove(previousChallenge);
			if (Objects.nonNull(challengePoint)) {
				challengePoint.setChallenge(nextChallenge);
				teamPoint.getChallengePoints().put(nextChallenge, challengePoint);
				teamPointRepository.save(teamPoint);
			}
		}
	}

	private void updateChallengeConfigurationData(ChallengeConfiguration challengeConfigurationToUpdate, ChallengeConfiguration challengeConfiguration) {
        // Update challenge number if provided and different
        if (Objects.nonNull(challengeConfiguration.getChallenge())
                && !challengeConfiguration.getChallenge().equals(challengeConfigurationToUpdate.getChallenge())) {
            challengeConfigurationRepository.findByChallenge(challengeConfiguration.getChallenge())
                    .filter(existing -> !existing.getId().equals(challengeConfigurationToUpdate.getId()))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException(
                                "Le num\u00e9ro d'\u00e9preuve " + challengeConfiguration.getChallenge() + " est d\u00e9j\u00e0 utilis\u00e9.");
                    });
            challengeConfigurationToUpdate.setChallenge(challengeConfiguration.getChallenge());
        }

        if (Objects.nonNull(challengeConfiguration.getName())) {
            challengeConfigurationToUpdate.setName(challengeConfiguration.getName());
        }

        // Handle group attachment
        if (challengeConfiguration.getGroup() == null) {
            // User chose "Aucun groupe"
            challengeConfigurationToUpdate.setGroup(null);
        } else if (challengeConfiguration.getGroup().getId() != null) {
            var group = challengeGroupRepository.findById(challengeConfiguration.getGroup().getId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Groupe d'\u00e9preuves introuvable (id=" + challengeConfiguration.getGroup().getId() + ")."));
            challengeConfigurationToUpdate.setGroup(group);
        } else if (challengeConfiguration.getGroup().getName() != null) {
            var group = challengeGroupRepository.findByName(challengeConfiguration.getGroup().getName())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Groupe d'\u00e9preuves introuvable (nom=" + challengeConfiguration.getGroup().getName() + ")."));
            challengeConfigurationToUpdate.setGroup(group);
        } else {
            challengeConfigurationToUpdate.setGroup(null);
        }
    }
}
