package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileInfo;

public interface ResponseFileInfoRepository extends MongoRepository<ResponseFileInfo, String> {
	List<ResponseFileInfo> findByStageAndPageAndTeamAndActiveIsTrue(Integer stage, Integer page, Integer team);

	@Query(sort = "{ team : 1, stage : 1, page : 1 }")
	List<ResponseFileInfo> findByStageAndTeamAndActiveIsTrue(Integer stage, Integer team);

	Page<ResponseFileInfo> findByCheckedFalseOrCheckedNull(Pageable pageable);
}
