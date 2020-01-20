package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResponse;

public interface StageResponseRepository extends MongoRepository<StageResponse, String> {
	Optional<StageResponse> findByStageAndTeam(Integer stage, Integer team);
}
