package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResult;

public interface StageResultRepository extends MongoRepository<StageResult, String> {
	List<StageResult> findByStageAndTeam(Integer stage, Integer team);
}
