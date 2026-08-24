package fr.vandriessche.rallyeschema.coreservice.repositories;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.FormDesign;

public interface FormDesignRepository extends MongoRepository<FormDesign, String> {
	Optional<FormDesign> findByChallengeConfigurationId(String challengeConfigurationId);
	void deleteByChallengeConfigurationId(String challengeConfigurationId);
}
