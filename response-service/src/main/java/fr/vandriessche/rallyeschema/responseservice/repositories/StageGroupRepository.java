package fr.vandriessche.rallyeschema.responseservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.responseservice.entities.StageGroup;

public interface StageGroupRepository extends MongoRepository<StageGroup, String> {
    java.util.Optional<StageGroup> findByName(String name);
}
