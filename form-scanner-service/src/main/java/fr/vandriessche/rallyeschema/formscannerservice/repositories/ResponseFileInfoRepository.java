package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileInfo;

public interface ResponseFileInfoRepository extends MongoRepository<ResponseFileInfo, String> {
	List<ResponseFileInfo> findByStageAndPageAndTeamAndActiveIsTrue(Integer stage, Integer page, Integer team);

	List<ResponseFileInfo> findByStageAndTeamAndActiveIsTrue(Integer stage, Integer team);
}
