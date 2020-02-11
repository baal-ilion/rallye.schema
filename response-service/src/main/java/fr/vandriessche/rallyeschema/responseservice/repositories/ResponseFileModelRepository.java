package fr.vandriessche.rallyeschema.responseservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileModel;

public interface ResponseFileModelRepository extends MongoRepository<ResponseFileModel, String> {

}
