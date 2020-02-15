package fr.vandriessche.rallyeschema.responseservice.repositories;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;

public interface TeamInfoRepository extends MongoRepository<TeamInfo, String> {
	Optional<TeamInfo> findByTeam(Integer team);

	Optional<TeamInfo> findByName(String name);
}
