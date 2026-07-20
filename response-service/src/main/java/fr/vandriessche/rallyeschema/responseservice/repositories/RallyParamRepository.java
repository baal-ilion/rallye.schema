package fr.vandriessche.rallyeschema.responseservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.responseservice.entities.RallyParam;

public interface RallyParamRepository extends MongoRepository<RallyParam, String> {
}
