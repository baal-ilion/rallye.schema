package fr.vandriessche.rallyeschema.coreservice.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import fr.vandriessche.rallyeschema.coreservice.entities.LogFile;

public interface LogFileRepository extends MongoRepository<LogFile, String> {
	interface TeamOnly {
		Integer getTeam();
	}

	void deleteBySourceAndTeam(String source, Integer team);

	List<TeamOnly> findBySource(String source);

	List<LogFile> findByTeam(Integer team);

	Optional<LogFile> findBySourceAndTeam(String source, Integer team);
}
