package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFileInfo;

public interface ResponceFileInfoRepository extends MongoRepository<ResponceFileInfo, String> {
	List<ResponceFileInfo> findByStageAndPageAndTeamAndActiveIsTrue(Integer stage, Integer page, Integer team);

	List<ResponceFileInfo> findByStageAndTeamAndActiveIsTrue(Integer stage, Integer team);
}
