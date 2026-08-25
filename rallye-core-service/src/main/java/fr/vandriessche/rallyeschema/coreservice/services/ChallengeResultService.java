package fr.vandriessche.rallyeschema.coreservice.services;

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

import fr.vandriessche.rallyeschema.coreservice.entities.PerformanceResult;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormSource;
import fr.vandriessche.rallyeschema.coreservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponseSource;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import fr.vandriessche.rallyeschema.coreservice.message.ChallengeResultMessage;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResultRepository;
import lombok.extern.java.Log;

@Service
@Log
public class ChallengeResultService {
	public static final String CHALLENGE_RESULT_CREATE_EVENT = "challengeResult.create";
	public static final String CHALLENGE_RESULT_UPDATE_EVENT = "challengeResult.update";
	public static final String CHALLENGE_RESULT_DELETE_EVENT = "challengeResult.delete";

	@Autowired
	private ChallengeResultRepository challengeResultRepository;
	@Autowired
	private MongoTemplate mongoTemplate;

	@Autowired
	private TeamService teamService;
	@Autowired
	private ChallengeConfigurationService challengeConfigurationService;
	@Autowired
	private SubmittedFormService submittedFormService;
	@Autowired
	private FormRecognitionConfigurationService formRecognitionConfigurationService;
	@Autowired
	private ChallengeResponseService challengeResponseService;
	@Autowired
	private MessageProducerService messageProducerService;

	@Autowired
	private RankingUpdatePublisher rankingUpdatePublisher;
	@Autowired
	private ChallengeResultUpdatePublisher challengeResultUpdatePublisher;

	public ChallengeResult beginChallengeResult(Integer challenge, Integer team) {
		ChallengeResult challengeResult = findOrMakeChallengeResultByChallengeAndTeam(challenge, team);
		if (Objects.nonNull(challengeResult))
			return updateChallengeResultAndSave(challengeResult, null, new ArrayList<>(), new ArrayList<>(),
					Instant.now().truncatedTo(ChronoUnit.SECONDS), null, "PROGRESSION");
		return null;
	}

	public ChallengeResult cancelChallengeResult(int challenge, int team) {
		// Supprime toutes les donnees liees a cette epreuve/equipe
		submittedFormService.deleteByChallengeAndTeam(challenge, team);
		challengeResponseService.deleteByChallengeAndTeam(challenge, team);

		List<ChallengeResult> challengeResults = challengeResultRepository.findAllByChallengeAndTeam(challenge, team);
		if (!challengeResults.isEmpty()) {
			challengeResults.forEach(sr -> {
				challengeResultRepository.delete(sr);
				messageProducerService.sendMessage(CHALLENGE_RESULT_DELETE_EVENT, new ChallengeResultMessage(sr));
				challengeResultUpdatePublisher.publishUpdate(sr.getChallenge(), sr.getTeam(), "DELETE");
			});
			rankingUpdatePublisher.publishRankingUpdate();
			return challengeResults.get(0);
		}
		// Meme si rien n'etait present (ex: annulation juste apres un begin non encore cree),
		// notifier pour forcer le rafraichissement des autres clients.
		rankingUpdatePublisher.publishRankingUpdate();
		return null;
	}

	public void deleteByTeam(Integer team) {
		challengeResultRepository.findByTeam(team).forEach(challengeResult -> {
			challengeResultRepository.delete(challengeResult);
			messageProducerService.sendMessage(CHALLENGE_RESULT_DELETE_EVENT, new ChallengeResultMessage(challengeResult));
			challengeResultUpdatePublisher.publishUpdate(challengeResult.getChallenge(), challengeResult.getTeam(), "DELETE");
		});
		rankingUpdatePublisher.publishRankingUpdate();
	}

	public void deleteByChallenge(Integer challenge) {
		var challengeResults = challengeResultRepository.findByChallenge(challenge);
		challengeResults.forEach(challengeResult -> {
			challengeResultRepository.delete(challengeResult);
			messageProducerService.sendMessage(CHALLENGE_RESULT_DELETE_EVENT, new ChallengeResultMessage(challengeResult));
			challengeResultUpdatePublisher.publishUpdate(challengeResult.getChallenge(), challengeResult.getTeam(), "DELETE");
		});
		if (!challengeResults.isEmpty()) {
			rankingUpdatePublisher.publishRankingUpdate();
		}
	}

	public ChallengeResult endChallengeResult(Integer challenge, Integer team) {
		ChallengeResult challengeResult = getChallengeResultByChallengeAndTeam(challenge, team);
		if (Objects.nonNull(challengeResult))
			return updateChallengeResultAndSave(challengeResult, null, new ArrayList<>(), new ArrayList<>(), null,
					Instant.now().truncatedTo(ChronoUnit.SECONDS), "PROGRESSION");
		return null;
	}

	public ChallengeResult getChallengeResult(String id) {
		return challengeResultRepository.findById(id).orElseThrow();
	}

	public ChallengeResult getChallengeResultByChallengeAndTeam(Integer challenge, Integer team) {
		return challengeResultRepository.findByChallengeAndTeam(challenge, team).orElse(null);
	}

	public List<ChallengeResult> getChallengeResults() {
		return challengeResultRepository.findAll();
	}

	public List<ChallengeResult> getChallengeResults(Integer challenge, Integer team, Boolean checked, Boolean entered,
			Boolean finished, Sort by) {
		List<Criteria> crits = new ArrayList<>();
		if (Objects.nonNull(challenge))
			crits.add(Criteria.where("challenge").is(challenge));
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
		var results = mongoTemplate.aggregate(agg, ChallengeResult.class, ChallengeResult.class);
		return results.getMappedResults();
	}

	public List<ChallengeResult> getChallengeResultsByTeam(Integer team) {
		return challengeResultRepository.findByTeam(team);
	}

	public void removeSubmittedFormEvent(SubmittedFormMetadata submittedFormMetadata) {
		var challengeResults = challengeResultRepository.findByResponseSourceId(submittedFormMetadata.getId(), SubmittedFormSource.class.getName());
		for (var challengeResult : challengeResults) {
			removeSubmittedForm(challengeResult, submittedFormMetadata.getId());
			resetPageResults(challengeResult, submittedFormMetadata.getChallenge(), submittedFormMetadata.getPage());
			challengeResult.setChecked(false);
			save(challengeResult);
		}
	}

	public void removeChallengeResponseEvent(String id) {
		var challengeResults = challengeResultRepository.findByResponseSourceId(id, ChallengeResponseSource.class.getName());
		for (var challengeResult : challengeResults) {
			removeChallengeResponseAndSearch(challengeResult, id);
			save(challengeResult);
		}
	}

	@Transactional
	public ChallengeResult selectSubmittedForm(Integer challenge, Integer team, String[] submittedFormIds, Boolean delete)
			throws InvalidAlgorithmParameterException, ParserConfigurationException, SAXException, IOException {
		validateSubmittedFormDestination(challenge, team);
		var submittedFormsMetadata = Stream.of(submittedFormIds)
				.map(submittedFormId -> submittedFormService.getSubmittedFormMetadata(submittedFormId))
				.collect(Collectors.toList());
		if (!submittedFormsMetadata.isEmpty()) {
			for (var submittedFormMetadata : submittedFormsMetadata) {
				if (!submittedFormMetadata.getChallenge().equals(challenge) || !submittedFormMetadata.getTeam().equals(team))
					throw new InvalidAlgorithmParameterException(
							"the submittedFormIds parameter must be for same challenge and team");
			}
			if (submittedFormsMetadata.stream().map(SubmittedFormMetadata::getPage).distinct().count() != submittedFormIds.length)
				throw new InvalidAlgorithmParameterException(
						"the submittedFormIds parameter must be for different pages");
			for (var submittedFormMetadata : submittedFormsMetadata)
				validateSubmittedFormPage(challenge, submittedFormMetadata.getPage());
			ChallengeResult challengeResult = findOrMakeChallengeResultByChallengeAndTeam(challenge, team);
			return selectSubmittedForm(challengeResult, submittedFormsMetadata, delete);
		}
		return null;
	}

	@Transactional
	public ChallengeResult releaseSubmittedForm(Integer challenge, Integer team, String submittedFormId)
			throws ParserConfigurationException, SAXException, IOException {
		SubmittedFormMetadata submittedFormMetadata = submittedFormService.getSubmittedFormMetadata(submittedFormId);
		if (!Objects.equals(submittedFormMetadata.getChallenge(), challenge) || !Objects.equals(submittedFormMetadata.getTeam(), team))
			throw new IllegalArgumentException("La feuille ne correspond pas à l’épreuve et à l’équipe demandées.");
		ChallengeResult challengeResult = challengeResultRepository.findByChallengeAndTeam(challenge, team).orElseThrow();
		SubmittedFormSource source = new SubmittedFormSource(submittedFormId);
		if (!challengeResult.getResponseSources().contains(source))
			throw new IllegalArgumentException("Cette feuille n’est pas utilisée par le résultat de l’épreuve.");

		submittedFormMetadata.setChecked(false);
		submittedFormService.updateSubmittedFormMetadataWithoutResultEvent(submittedFormMetadata);
		removeSubmittedForm(challengeResult, submittedFormId);
		resetPageResults(challengeResult, challenge, submittedFormMetadata.getPage());
		challengeResult.setChecked(false);
		return save(challengeResult);
	}

	@Transactional
	public ChallengeResult deleteSelectedSubmittedForm(Integer challenge, Integer team, String submittedFormId) {
		SubmittedFormMetadata submittedFormMetadata = submittedFormService.getSubmittedFormMetadata(submittedFormId);
		if (!Objects.equals(submittedFormMetadata.getChallenge(), challenge) || !Objects.equals(submittedFormMetadata.getTeam(), team))
			throw new IllegalArgumentException("La feuille ne correspond pas à l’épreuve et à l’équipe demandées.");
		ChallengeResult challengeResult = challengeResultRepository.findByChallengeAndTeam(challenge, team).orElseThrow();
		SubmittedFormSource source = new SubmittedFormSource(submittedFormId);
		if (!challengeResult.getResponseSources().contains(source))
			throw new IllegalArgumentException("Cette feuille n’est pas utilisée par le résultat de l’épreuve.");

		removeSubmittedForm(challengeResult, submittedFormId);
		resetPageResults(challengeResult, challenge, submittedFormMetadata.getPage());
		challengeResult.setChecked(false);
		challengeResult = save(challengeResult);
		submittedFormService.deleteSubmittedForm(submittedFormId);
		return challengeResult;
	}

	private void validateSubmittedFormDestination(Integer challenge, Integer team) {
		if (Objects.isNull(team) || Objects.isNull(teamService.getTeamByTeam(team)))
			throw new IllegalArgumentException("Impossible d’accepter le formulaire : l’équipe " + team + " n’existe pas.");
		if (Objects.isNull(challenge) || Objects.isNull(challengeConfigurationService.getChallengeConfigurationByChallenge(challenge)))
			throw new IllegalArgumentException("Impossible d’accepter le formulaire : l’épreuve " + challenge + " n’existe pas.");
	}

	private void validateSubmittedFormPage(Integer challenge, Integer page) {
		if (Objects.isNull(page)
				|| formRecognitionConfigurationService.getFormRecognitionConfigurationByChallengeAndPage(challenge, page).isEmpty())
			throw new IllegalArgumentException("Impossible d’accepter le formulaire : la page " + page
					+ " n’existe pas pour l’épreuve " + challenge + ".");
	}

	public ChallengeResult undoChallengeResult(int challenge, int team) {
		ChallengeResult challengeResult = getChallengeResultByChallengeAndTeam(challenge, team);
		if (Objects.nonNull(challengeResult)) {
			challengeResult.setEnd(null);
			challengeResult.setChecked(false);
			return save(challengeResult, "PROGRESSION");
		}
		return null;
	}

	public void updateSubmittedFormEvent(String id) {
		var submittedFormMetadata = submittedFormService.getSubmittedFormMetadata(id);
		var challengeResults = challengeResultRepository.findByResponseSourceId(id, SubmittedFormSource.class.getName());
		boolean found = false;
		for (var challengeResult : challengeResults) {
			log.info("updateSubmittedFormEvent: " + challengeResult.getId());
			if (Objects.nonNull(submittedFormMetadata) && challengeResult.getChallenge().equals(submittedFormMetadata.getChallenge())
					&& challengeResult.getTeam().equals(submittedFormMetadata.getTeam())) {
				found = true;
				updateSubmittedForm(challengeResult, submittedFormMetadata);
				save(challengeResult);
			} else {
				removeSubmittedFormAndSearch(challengeResult, id);
				save(challengeResult);
			}
		}
		if (!found && Objects.nonNull(submittedFormMetadata)) {
			ChallengeResult challengeResult = findOrMakeChallengeResultByChallengeAndTeam(submittedFormMetadata.getChallenge(),
					submittedFormMetadata.getTeam());
			updateSubmittedForm(challengeResult, submittedFormMetadata);
			save(challengeResult);
		}
	}

	public void updateChallengeResponseEvent(String id) {
		var challengeResponse = challengeResponseService.getChallengeResponse(id);
		var challengeResults = challengeResultRepository.findByResponseSourceId(id, ChallengeResponseSource.class.getName());
		boolean found = false;
		for (var challengeResult : challengeResults) {
			log.info("updateSubmittedFormEvent: " + challengeResult.getId());
			if (Objects.nonNull(challengeResponse) && challengeResult.getChallenge().equals(challengeResponse.getChallenge())
					&& challengeResult.getTeam().equals(challengeResponse.getTeam())) {
				found = true;
				updateChallengeResponse(challengeResult, challengeResponse);
				save(challengeResult);
			} else {
				removeChallengeResponseAndSearch(challengeResult, id);
				save(challengeResult);
			}
		}
		if (!found && Objects.nonNull(challengeResponse)) {
			ChallengeResult challengeResult = findOrMakeChallengeResultByChallengeAndTeam(challengeResponse.getChallenge(),
					challengeResponse.getTeam());
			updateChallengeResponse(challengeResult, challengeResponse);
			save(challengeResult);
		}
	}

	public ChallengeResult updateChallengeResult(ChallengeResult challengeResult) {
		ChallengeResult challengeResultToUpdate = Objects.nonNull(challengeResult.getId())
				? challengeResultRepository.findById(challengeResult.getId()).orElseThrow()
				: challengeResultRepository.findByChallengeAndTeam(challengeResult.getChallenge(), challengeResult.getTeam()).orElseThrow();
		return updateChallengeResultAndSave(challengeResultToUpdate, challengeResult.getChecked(), challengeResult.getResults(),
				challengeResult.getPerformances(), challengeResult.getBegin(), challengeResult.getEnd());
	}

	private boolean checkSubmittedFormSources(ChallengeResult challengeResult, SubmittedFormMetadata submittedFormMetadata) {
		SubmittedFormSource source = new SubmittedFormSource(submittedFormMetadata.getId());
		if (!Boolean.TRUE.equals(submittedFormMetadata.getChecked()))
			return false;
		if (challengeResult.getResponseSources().contains(source))
			return true;
		// Il ne doit pas y avoir de réponce
		if (challengeResult.getResponseSources().stream().anyMatch(s -> s.getClass().equals(ChallengeResponseSource.class)))
			return false;
		// Il ne doit pas y avoir la même feuille de réponse
		return submittedFormService.getSameSubmittedFormMetadatas(submittedFormMetadata).stream()
				.map(r -> new SubmittedFormSource(r.getId()))
				.noneMatch(s -> challengeResult.getResponseSources().contains(s));
	}

	private boolean checkChallengeResponseSources(ChallengeResult challengeResult, ChallengeResponse challengeResponse) {
		ChallengeResponseSource source = new ChallengeResponseSource(challengeResponse.getId(), null);
		if (challengeResult.getResponseSources().contains(source))
			return true;
		return challengeResponse.isFinalised() && challengeResponse.isActive();
	}

	private ChallengeResult findOrMakeChallengeResultByChallengeAndTeam(Integer challenge, Integer team) {
		if (Objects.isNull(challenge))
			return null;
		if (Objects.isNull(team))
			return null;
		return challengeResultRepository.findByChallengeAndTeam(challenge, team).orElse(makeChallengeResult(challenge, team));
	}

	private ChallengeResult makeChallengeResult(Integer challenge, Integer team) {
		if (Objects.nonNull(teamService.getTeamByTeam(team))
				&& Objects.nonNull(challengeConfigurationService.getChallengeConfigurationByChallenge(challenge)))
			return new ChallengeResult(challenge, team);
		return null;
	}

	private void removeSubmittedForm(ChallengeResult challengeResult, String id) {
		SubmittedFormSource sourceToRemove = new SubmittedFormSource(id);
		challengeResult.getResponseSources().removeIf(source -> sourceToRemove.equals(source));
		challengeResult.getResults().removeIf(result -> sourceToRemove.equals(result.getSource()));
		challengeResult.getPerformances().removeIf(perf -> sourceToRemove.equals(perf.getSource()));
	}

	private void removeSubmittedFormAndSearch(ChallengeResult challengeResult, String id) {
		removeSubmittedForm(challengeResult, id);
		if (!searchChallengeResponse(challengeResult, null))
			searchSubmittedForm(challengeResult, null, id);
	}

	private void removeChallengeResponse(ChallengeResult challengeResult, String id) {
		ChallengeResponseSource sourceToRemove = new ChallengeResponseSource(id, null);
		challengeResult.getResponseSources().removeIf(source -> sourceToRemove.equals(source));
		challengeResult.getResults().removeIf(result -> sourceToRemove.equals(result.getSource()));
		challengeResult.getPerformances().removeIf(perf -> sourceToRemove.equals(perf.getSource()));
	}

	private void removeChallengeResponseAndSearch(ChallengeResult challengeResult, String id) {
		removeChallengeResponse(challengeResult, id);
		if (!searchChallengeResponse(challengeResult, id))
			searchSubmittedForm(challengeResult, null, null);
	}

	private ChallengeResult save(ChallengeResult challengeResult) {
		return save(challengeResult, "CONTENT");
	}

	private ChallengeResult save(ChallengeResult challengeResult, String updateScope) {
		challengeResult = challengeResultRepository.save(challengeResult);
		messageProducerService.sendMessage(CHALLENGE_RESULT_UPDATE_EVENT, new ChallengeResultMessage(challengeResult));
		rankingUpdatePublisher.publishRankingUpdate();
		challengeResultUpdatePublisher.publishUpdate(challengeResult.getChallenge(), challengeResult.getTeam(), "UPDATE", updateScope);
		return challengeResult;
	}

	private void searchSubmittedForm(ChallengeResult challengeResult, Integer page, String excludedSubmittedFormId) {
		var submittedForms = Objects.nonNull(page)
				? submittedFormService.getSubmittedFormMetadatasByChallengeAndPageAndTeam(challengeResult.getChallenge(), page,
						challengeResult.getTeam())
				: submittedFormService.getSubmittedFormMetadatasByChallengeAndTeam(challengeResult.getChallenge(), challengeResult.getTeam());
		submittedForms.forEach(submittedFormMetadata -> {
			if (!submittedFormMetadata.getId().equals(excludedSubmittedFormId)
					&& checkSubmittedFormSources(challengeResult, submittedFormMetadata)) {
				setSubmittedForm(challengeResult, submittedFormMetadata);
				if (Objects.nonNull(page))
					return;
			}
		});
	}

	private boolean searchChallengeResponse(ChallengeResult challengeResult, String excludedChallengeResponseId) {
		ChallengeResponse challengeResponse = challengeResponseService.getChallengeResponseByChallengeAndTeam(challengeResult.getChallenge(),
				challengeResult.getTeam());
		if (Objects.nonNull(challengeResponse) && !challengeResponse.getId().equals(excludedChallengeResponseId)
				&& checkChallengeResponseSources(challengeResult, challengeResponse)) {
			setChallengeResponse(challengeResult, challengeResponse);
			return true;
		}
		return false;
	}

	private ChallengeResult selectSubmittedForm(ChallengeResult challengeResult, List<SubmittedFormMetadata> submittedFormsMetadata,
			Boolean delete) throws ParserConfigurationException, SAXException, IOException {
		var toUpdate = new ArrayList<SubmittedFormMetadata>();
		var initalSources = challengeResult.getResponseSources().stream()
				.filter(s -> s.getClass().equals(SubmittedFormSource.class)).collect(Collectors.toList());

		for (var submittedFormMetadata : submittedFormsMetadata) {
			resetPageResults(challengeResult, submittedFormMetadata.getChallenge(), submittedFormMetadata.getPage());
			if (!Boolean.TRUE.equals(submittedFormMetadata.getChecked())) {
				submittedFormMetadata.setChecked(true);
				toUpdate.add(submittedFormMetadata);
			}
			setSubmittedForm(challengeResult, submittedFormMetadata);
		}
		challengeResult = save(challengeResult);
		var selectedIds = submittedFormsMetadata.stream().map(SubmittedFormMetadata::getId).collect(Collectors.toSet());
		var replacedSubmittedFormMetadatas = submittedFormsMetadata.stream()
				.flatMap(submittedFormMetadata -> submittedFormService.getSameSubmittedFormMetadatas(submittedFormMetadata).stream())
				.filter(submittedFormMetadata -> !selectedIds.contains(submittedFormMetadata.getId()))
				.filter(submittedFormMetadata -> Boolean.TRUE.equals(submittedFormMetadata.getChecked()))
				.collect(Collectors.toMap(SubmittedFormMetadata::getId, submittedFormMetadata -> submittedFormMetadata,
						(first, ignored) -> first));
		for (var submittedFormMetadata : replacedSubmittedFormMetadatas.values()) {
					submittedFormMetadata.setChecked(false);
					submittedFormService.updateSubmittedFormMetadataWithoutResultEvent(submittedFormMetadata);
		}
		for (var submittedFormMetadata : toUpdate) {
			// Le résultat vient déjà d'être sauvegardé et publié ci-dessus :
			// ne pas provoquer un second recalcul du classement pour chaque page.
			submittedFormService.updateSubmittedFormMetadataWithoutResultEvent(submittedFormMetadata);
		}
		if (Boolean.TRUE.equals(delete)) {
			for (var source : initalSources) {
				if (!challengeResult.getResponseSources().contains(source))
					submittedFormService.deleteSubmittedForm(source.getId());
			}
		}
		return challengeResult;
	}

	private void resetPageResults(ChallengeResult challengeResult, Integer challenge, Integer page) {
		var pageConfiguration = formRecognitionConfigurationService.getFormRecognitionConfigurationByChallengeAndPage(challenge, page).orElse(null);
		if (Objects.isNull(pageConfiguration))
			return;
		var questionNames = pageConfiguration.getQuestions().keySet();
		challengeResult.getResults().removeIf(result -> questionNames.contains(result.getName()));
		challengeResult.getPerformances().removeIf(performance -> questionNames.contains(performance.getName()));
		var challengeConfiguration = challengeConfigurationService.getChallengeConfigurationByChallenge(challengeResult.getChallenge());
		if (Objects.nonNull(challengeConfiguration))
			challengeResult.setMissing((int) (challengeConfiguration.getQuestionDefinitions().size()
					- challengeResult.getResults().stream().filter(result -> Objects.nonNull(result.getResultValue())).count()
					- challengeResult.getPerformances().stream()
							.filter(performance -> Objects.nonNull(performance.getPerformanceValue())).count()));
	}

	private void setSubmittedForm(ChallengeResult challengeResult, SubmittedFormMetadata submittedFormMetadata) {
		submittedFormService.getSameSubmittedFormMetadatas(submittedFormMetadata)
				.forEach(r -> removeSubmittedForm(challengeResult, r.getId()));
		ChallengeResponse challengeResponse = challengeResponseService.getChallengeResponseByChallengeAndTeam(submittedFormMetadata.getChallenge(),
				submittedFormMetadata.getTeam());
		if (Objects.nonNull(challengeResponse))
			removeChallengeResponse(challengeResult, challengeResponse.getId());
		SubmittedFormSource source = new SubmittedFormSource(submittedFormMetadata.getId());
		if (!challengeResult.getResponseSources().contains(source))
			challengeResult.getResponseSources().add(source);
		updateChallengeResult(challengeResult, null, submittedFormService.getResponseResultFromSubmittedForm(submittedFormMetadata),
				submittedFormService.getPerformanceResultFromSubmittedForm(submittedFormMetadata), null, null);
	}

	private void setChallengeResponse(ChallengeResult challengeResult, ChallengeResponse challengeResponse) {
		submittedFormService.getSubmittedFormMetadatasByChallengeAndTeam(challengeResponse.getChallenge(), challengeResponse.getTeam())
				.forEach(r -> removeChallengeResponse(challengeResult, r.getId()));
		ChallengeResponseSource source = new ChallengeResponseSource(challengeResponse.getId(),
				Objects.nonNull(challengeResponse.getQuestions()) || Objects.nonNull(challengeResponse.getTotal()));
		if (!challengeResult.getResponseSources().contains(source))
			challengeResult.getResponseSources().add(source);
		updateChallengeResult(challengeResult, null, challengeResponseService.getResponseResultFromChallengeResponse(challengeResponse),
				challengeResponseService.getPerformanceResultFromChallengeResponse(challengeResponse), challengeResponse.getBegin(),
				challengeResponse.getEnd());
	}

	private void updateSubmittedForm(ChallengeResult challengeResult, SubmittedFormMetadata submittedFormMetadata) {
		if (checkSubmittedFormSources(challengeResult, submittedFormMetadata)) {
			setSubmittedForm(challengeResult, submittedFormMetadata);
		} else {
			removeSubmittedFormAndSearch(challengeResult, submittedFormMetadata.getId());
		}
	}

	private void updateChallengeResponse(ChallengeResult challengeResult, ChallengeResponse challengeResponse) {
		if (checkChallengeResponseSources(challengeResult, challengeResponse)) {
			setChallengeResponse(challengeResult, challengeResponse);
		} else {
			removeChallengeResponseAndSearch(challengeResult, challengeResponse.getId());
		}
	}

	private boolean updateChallengeResult(ChallengeResult challengeResultToUpdate, Boolean checked, List<ResponseResult> results,
			List<PerformanceResult> performances, Instant begin, Instant end) {
		boolean isUpdated = false;

		if (Objects.nonNull(begin)) {
			challengeResultToUpdate.setBegin(begin);
			isUpdated = true;
		}
		if (Objects.nonNull(end)) {
			challengeResultToUpdate.setEnd(end);
			isUpdated = true;
		}
		for (var result : results) {
			challengeResultToUpdate.getResults().removeIf(r -> r.getName().equals(result.getName()));
			challengeResultToUpdate.getResults().add(result);
			isUpdated = true;
		}
		for (var performance : performances) {
			challengeResultToUpdate.getPerformances().removeIf(r -> r.getName().equals(performance.getName()));
			challengeResultToUpdate.getPerformances().add(performance);
			isUpdated = true;
		}
		challengeResultToUpdate.getResults().sort(Comparator.comparing(ResponseResult::getName));
		if (isUpdated)
			challengeResultToUpdate.setChecked(false);

		if (isUpdated || Objects.nonNull(checked)) {
			var challengeConfiguration = Optional.ofNullable(challengeConfigurationService.getChallengeConfigurationByChallenge(challengeResultToUpdate.getChallenge()))
					.orElseThrow();
			challengeResultToUpdate.setMissing((int) (challengeConfiguration.getQuestionDefinitions().size()
					- challengeResultToUpdate.getResults().stream().filter(r -> Objects.nonNull(r.getResultValue())).count()
					- challengeResultToUpdate.getPerformances().stream()
							.filter(r -> Objects.nonNull(r.getPerformanceValue())).count()));
		}
		if (Objects.nonNull(checked)) {
			challengeResultToUpdate.setChecked(checked);
			isUpdated = true;
		}
		return isUpdated;
	}

	private ChallengeResult updateChallengeResultAndSave(ChallengeResult challengeResultToUpdate, Boolean checked,
			List<ResponseResult> results, List<PerformanceResult> performances, Instant begin, Instant end) {
		return updateChallengeResultAndSave(challengeResultToUpdate, checked, results, performances, begin, end, "CONTENT");
	}

	private ChallengeResult updateChallengeResultAndSave(ChallengeResult challengeResultToUpdate, Boolean checked,
			List<ResponseResult> results, List<PerformanceResult> performances, Instant begin, Instant end,
			String updateScope) {
		if (updateChallengeResult(challengeResultToUpdate, checked, results, performances, begin, end))
			return save(challengeResultToUpdate, updateScope);
		return challengeResultToUpdate;
	}
}
