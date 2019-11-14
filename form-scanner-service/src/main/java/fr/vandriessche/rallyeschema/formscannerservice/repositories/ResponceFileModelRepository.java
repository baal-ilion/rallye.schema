package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFileModel;

public interface ResponceFileModelRepository extends MongoRepository<ResponceFileModel, String> {

}
