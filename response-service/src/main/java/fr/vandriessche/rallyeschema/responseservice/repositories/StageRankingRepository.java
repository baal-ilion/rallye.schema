package fr.vandriessche.rallyeschema.responseservice.repositories;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.responseservice.entities.StageRanking;

public interface StageRankingRepository extends MongoRepository<StageRanking, String> {
	Optional<StageRanking> findByStage(Integer stage);
}