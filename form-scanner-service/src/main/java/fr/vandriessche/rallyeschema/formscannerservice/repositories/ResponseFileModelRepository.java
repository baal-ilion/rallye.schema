package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileModel;

public interface ResponseFileModelRepository extends MongoRepository<ResponseFileModel, String> {

}
