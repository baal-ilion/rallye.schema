package fr.vandriessche.rallyeschema.responseservice.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;

public interface StageResultRepository extends MongoRepository<StageResult, String> {
	Optional<StageResult> findByStageAndTeam(Integer stage, Integer team);

	List<StageResult> findByTeam(Integer team);

	@Query("{ $or: [" + "  { responseSources: { $elemMatch: { _id: ObjectId('?0'), _class: ?1 } } }"
			+ ", { results: { $elemMatch: { source: { _id: ObjectId('?0'), _class: ?1 } } } }"
			+ ", { performances: { $elemMatch: { source: { _id: ObjectId('?0'), _class: ?1 } } } }" + " ] }")
	List<StageResult> findByResponseSourceId(String id, String className);
}
