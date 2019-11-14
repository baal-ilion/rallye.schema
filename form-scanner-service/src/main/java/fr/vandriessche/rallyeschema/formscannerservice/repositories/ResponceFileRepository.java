package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFile;

public interface ResponceFileRepository extends MongoRepository<ResponceFile, String> {

}
