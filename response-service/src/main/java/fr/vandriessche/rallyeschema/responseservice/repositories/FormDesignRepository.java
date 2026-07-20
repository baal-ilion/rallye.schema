package fr.vandriessche.rallyeschema.responseservice.repositories;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.responseservice.entities.FormDesign;

public interface FormDesignRepository extends MongoRepository<FormDesign, String> {
	Optional<FormDesign> findByStageParamId(String stageParamId);
	void deleteByStageParamId(String stageParamId);
}
