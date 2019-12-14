package fr.vandriessche.rallyeschema.formscannerservice.repositories;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.formscannerservice.entities.TeamInfo;

public interface TeamInfoRepository extends MongoRepository<TeamInfo, String> {
	Optional<TeamInfo> findByTeam(Integer team);

	Optional<TeamInfo> findByName(String name);
}
