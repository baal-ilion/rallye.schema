package fr.vandriessche.rallyeschema.coreservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedForm;

public interface SubmittedFormRepository extends MongoRepository<SubmittedForm, String> {

}
