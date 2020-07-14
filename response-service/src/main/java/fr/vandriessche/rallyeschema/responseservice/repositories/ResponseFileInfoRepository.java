package fr.vandriessche.rallyeschema.responseservice.repositories;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;

public interface ResponseFileInfoRepository extends MongoRepository<ResponseFileInfo, String> {
	List<ResponseFileInfo> findByStageAndPageAndTeam(Integer stage, Integer page, Integer team);

	@Query(sort = "{ team : 1, stage : 1, page : 1 }")
	List<ResponseFileInfo> findByStageAndTeam(Integer stage, Integer team);

	Page<ResponseFileInfo> findByCheckedFalseOrCheckedNull(Pageable pageable);

	List<ResponseFileInfo> findByTeam(Integer team);
}
