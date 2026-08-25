package fr.vandriessche.rallyeschema.coreservice.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;

public interface ChallengeResultRepository extends MongoRepository<ChallengeResult, String> {
	Optional<ChallengeResult> findByChallengeAndTeam(Integer challenge, Integer team);

	List<ChallengeResult> findAllByChallengeAndTeam(Integer challenge, Integer team);

	List<ChallengeResult> findByTeam(Integer team);

	List<ChallengeResult> findByChallenge(Integer challenge);

	@Query("{ $or: [" + "  { responseSources: { $elemMatch: { _id: ObjectId('?0'), _class: ?1 } } }"
			+ ", { results: { $elemMatch: { source: { _id: ObjectId('?0'), _class: ?1 } } } }"
			+ ", { performances: { $elemMatch: { source: { _id: ObjectId('?0'), _class: ?1 } } } }" + " ] }")
	List<ChallengeResult> findByResponseSourceId(String id, String className);
}
