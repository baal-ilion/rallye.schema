package fr.vandriessche.rallyeschema.coreservice.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;

public interface ChallengeResponseRepository extends MongoRepository<ChallengeResponse, String> {
	Optional<ChallengeResponse> findByChallengeAndTeam(Integer challenge, Integer team);

	List<ChallengeResponse> findAllByChallengeAndTeam(Integer challenge, Integer team);

	List<ChallengeResponse> findByTeam(Integer team);

	List<ChallengeResponse> findByChallenge(Integer challenge);
}
