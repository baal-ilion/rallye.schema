package fr.vandriessche.rallyeschema.coreservice.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.Team;

public interface TeamRepository extends MongoRepository<Team, String> {
	Optional<Team> findByTeam(Integer team);

	Optional<Team> findByName(String name);

	List<Team> findByPresentTrue();

    List<Team> findByPresentFalse();
}
