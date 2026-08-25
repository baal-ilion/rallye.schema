package fr.vandriessche.rallyeschema.coreservice.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.coreservice.entities.PerformanceResult;
import fr.vandriessche.rallyeschema.coreservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponseSource;
import fr.vandriessche.rallyeschema.coreservice.message.ChallengeResponseMessage;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResponseRepository;

@Service
public class ChallengeResponseService {
	public static final String CHALLENGE_RESPONSE_CREATE_EVENT = "challengeResponse.create";
	public static final String CHALLENGE_RESPONSE_UPDATE_EVENT = "challengeResponse.update";
	public static final String CHALLENGE_RESPONSE_DELETE_EVENT = "challengeResponse.delete";

	@Autowired
	private ChallengeResponseRepository challengeResponseRepository;

	@Autowired
	private MessageProducerService messageProducerService;

	public ChallengeResponse addOrReplaceChallengeResponse(final ChallengeResponse challengeResponse) {
		if (Objects.nonNull(challengeResponse.getId())) {
			challengeResponseRepository.findById(challengeResponse.getId()).orElseThrow();
		} else {
			challengeResponseRepository.findByChallengeAndTeam(challengeResponse.getChallenge(), challengeResponse.getTeam())
					.ifPresent(s -> challengeResponse.setId(s.getId()));
		}
		var challengeResponse2 = challengeResponseRepository.save(challengeResponse);
		messageProducerService.sendMessage(
				Objects.nonNull(challengeResponse.getId()) ? CHALLENGE_RESPONSE_UPDATE_EVENT : CHALLENGE_RESPONSE_CREATE_EVENT,
				new ChallengeResponseMessage(challengeResponse2));
		return challengeResponse2;
	}

	public void deleteByTeam(Integer team) {
		challengeResponseRepository.findByTeam(team).forEach(challengeResponse -> {
			challengeResponseRepository.delete(challengeResponse);
			messageProducerService.sendMessage(CHALLENGE_RESPONSE_DELETE_EVENT, new ChallengeResponseMessage(challengeResponse));
		});
	}

	public void deleteByChallengeAndTeam(Integer challenge, Integer team) {
		challengeResponseRepository.findAllByChallengeAndTeam(challenge, team).forEach(challengeResponse -> {
			challengeResponseRepository.delete(challengeResponse);
			messageProducerService.sendMessage(CHALLENGE_RESPONSE_DELETE_EVENT, new ChallengeResponseMessage(challengeResponse));
		});
	}

	public void deleteChallengeResponse(String id) {
		challengeResponseRepository.findById(id).ifPresent(challengeResponse -> {
			challengeResponseRepository.delete(challengeResponse);
			messageProducerService.sendMessage(CHALLENGE_RESPONSE_DELETE_EVENT, new ChallengeResponseMessage(challengeResponse));
		});
	}

	public List<PerformanceResult> getPerformanceResultFromChallengeResponse(ChallengeResponse challengeResponse) {
		ChallengeResponseSource source = new ChallengeResponseSource(challengeResponse.getId(), null);
		if (Objects.nonNull(challengeResponse.getPerformances())) {
			challengeResponse.getPerformances().forEach(r -> r.setSource(source));
			return challengeResponse.getPerformances();
		}
		return new ArrayList<>();
	}

	public List<ResponseResult> getResponseResultFromChallengeResponse(ChallengeResponse challengeResponse) {
		ChallengeResponseSource source = new ChallengeResponseSource(challengeResponse.getId(), null);
		if (Objects.nonNull(challengeResponse.getResults())) {
			challengeResponse.getResults().forEach(r -> r.setSource(source));
			return challengeResponse.getResults();
		}
		List<ResponseResult> results = new ArrayList<>();
		return results;
	}

	public ChallengeResponse getChallengeResponse(String id) {
		return challengeResponseRepository.findById(id).orElseThrow();
	}

	public ChallengeResponse getChallengeResponseByChallengeAndTeam(Integer challenge, Integer team) {
		return challengeResponseRepository.findByChallengeAndTeam(challenge, team).orElse(null);
	}

	public List<ChallengeResponse> getChallengeResponses() {
		return challengeResponseRepository.findAll();
	}

	public void deleteByChallenge(Integer challenge) {
		challengeResponseRepository.findByChallenge(challenge).forEach(challengeResponse -> {
			challengeResponseRepository.delete(challengeResponse);
			messageProducerService.sendMessage(CHALLENGE_RESPONSE_DELETE_EVENT, new ChallengeResponseMessage(challengeResponse));
		});
	}
}
