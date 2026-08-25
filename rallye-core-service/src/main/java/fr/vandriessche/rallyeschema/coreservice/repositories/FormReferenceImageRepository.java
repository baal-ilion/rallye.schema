package fr.vandriessche.rallyeschema.coreservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.FormReferenceImage;

public interface FormReferenceImageRepository extends MongoRepository<FormReferenceImage, String> {

}
