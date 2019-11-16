package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFile;

public interface ResponseFileRepository extends MongoRepository<ResponseFile, String> {

}
