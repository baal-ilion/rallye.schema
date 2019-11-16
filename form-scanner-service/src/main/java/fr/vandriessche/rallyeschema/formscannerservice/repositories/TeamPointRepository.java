package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.TeamPoint;

public interface TeamPointRepository extends MongoRepository<TeamPoint, String> {
	Optional<TeamPoint> findByTeam(Integer team);
}
