package fr.vandriessche.rallyeschema.coreservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeGroup;

public interface ChallengeGroupRepository extends MongoRepository<ChallengeGroup, String> {
    java.util.Optional<ChallengeGroup> findByName(String name);
}
