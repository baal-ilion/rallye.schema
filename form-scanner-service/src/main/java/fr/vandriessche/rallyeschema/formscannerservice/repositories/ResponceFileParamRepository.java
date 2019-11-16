package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFileParam;

public interface ResponceFileParamRepository extends MongoRepository<ResponceFileParam, String> {
	List<ResponceFileParam> findByStage(Integer stage);

	Optional<ResponceFileParam> findByStageAndPage(Integer stage, Integer page);
}
