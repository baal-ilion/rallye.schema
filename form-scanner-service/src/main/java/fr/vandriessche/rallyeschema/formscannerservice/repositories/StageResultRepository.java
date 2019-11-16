package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResult;

public interface StageResultRepository extends MongoRepository<StageResult, String> {
	Optional<StageResult> findByStageAndTeam(Integer stage, Integer team);

	List<StageResult> findByTeam(Integer team);
}
