package fr.vandriessche.rallyeschema.responseservice.repositories;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;

public interface StageParamRepository extends MongoRepository<StageParam, String> {
	Optional<StageParam> findByStage(Integer stage);
}
