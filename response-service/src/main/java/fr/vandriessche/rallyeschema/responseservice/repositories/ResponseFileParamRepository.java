package fr.vandriessche.rallyeschema.responseservice.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileParam;

public interface ResponseFileParamRepository extends MongoRepository<ResponseFileParam, String> {
	List<ResponseFileParam> findByStage(Integer stage);

	Optional<ResponseFileParam> findByStageAndPage(Integer stage, Integer page);
}
