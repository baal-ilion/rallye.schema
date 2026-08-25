package fr.vandriessche.rallyeschema.coreservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.RallyConfiguration;

public interface RallyConfigurationRepository extends MongoRepository<RallyConfiguration, String> {
}
