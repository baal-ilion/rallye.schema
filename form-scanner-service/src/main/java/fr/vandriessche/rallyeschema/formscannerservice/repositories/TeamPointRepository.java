package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.TeamPoint;

public interface TeamPointRepository extends MongoRepository<TeamPoint, String> {
	TeamPoint findByTeam(Integer team);
}
