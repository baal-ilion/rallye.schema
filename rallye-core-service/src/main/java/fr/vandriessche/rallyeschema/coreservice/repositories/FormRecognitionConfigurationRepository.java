package fr.vandriessche.rallyeschema.coreservice.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;

public interface FormRecognitionConfigurationRepository extends MongoRepository<FormRecognitionConfiguration, String> {
	List<FormRecognitionConfiguration> findByChallenge(Integer challenge);

	Optional<FormRecognitionConfiguration> findByChallengeAndPage(Integer challenge, Integer page);

	Optional<FormRecognitionConfiguration> findByChallengeIsNullAndPageIsNull();
}
