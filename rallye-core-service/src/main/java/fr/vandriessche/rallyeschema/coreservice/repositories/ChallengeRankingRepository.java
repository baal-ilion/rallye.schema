package fr.vandriessche.rallyeschema.coreservice.repositories;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeRanking;

public interface ChallengeRankingRepository extends MongoRepository<ChallengeRanking, String> {
	Optional<ChallengeRanking> findByChallenge(Integer challenge);
}