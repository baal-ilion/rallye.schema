package fr.vandriessche.rallyeschema.coreservice.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeGroup;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;

public interface ChallengeConfigurationRepository extends MongoRepository<ChallengeConfiguration, String> {

    Optional<ChallengeConfiguration> findByChallenge(Integer challenge);

    List<ChallengeConfiguration> findByGroup(ChallengeGroup group);
}
