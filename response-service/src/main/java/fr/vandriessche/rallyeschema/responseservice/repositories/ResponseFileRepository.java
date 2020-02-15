package fr.vandriessche.rallyeschema.responseservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFile;

public interface ResponseFileRepository extends MongoRepository<ResponseFile, String> {

}
