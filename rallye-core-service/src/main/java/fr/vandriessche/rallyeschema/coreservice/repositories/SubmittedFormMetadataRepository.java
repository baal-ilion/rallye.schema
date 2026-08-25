package fr.vandriessche.rallyeschema.coreservice.repositories;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;

public interface SubmittedFormMetadataRepository extends MongoRepository<SubmittedFormMetadata, String> {
	List<SubmittedFormMetadata> findByChallengeAndPageAndTeam(Integer challenge, Integer page, Integer team);

	@Query(sort = "{ team : 1, challenge : 1, page : 1 }")
	List<SubmittedFormMetadata> findByChallengeAndTeam(Integer challenge, Integer team);

	List<SubmittedFormMetadata> findByTeam(Integer team);

	List<SubmittedFormMetadata> findByChallenge(Integer challenge);

	java.util.Optional<SubmittedFormMetadata> findByUploadId(String uploadId);
}
