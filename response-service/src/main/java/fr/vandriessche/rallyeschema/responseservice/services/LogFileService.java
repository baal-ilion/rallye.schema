package fr.vandriessche.rallyeschema.responseservice.services;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.apache.commons.io.FilenameUtils;
import org.bson.BsonBinarySubType;
import org.bson.types.Binary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import fr.vandriessche.rallyeschema.responseservice.entities.LogFile;
import fr.vandriessche.rallyeschema.responseservice.repositories.LogFileRepository;
import lombok.extern.java.Log;

@Service
@Log
public class LogFileService {
	@Autowired
	private LogFileRepository logFileRepository;
	@Autowired
	private TeamInfoService teamInfoService;

	public void deleteLogFile(String source, Integer team) {
		logFileRepository.deleteBySourceAndTeam(source.toLowerCase(), team);
	}

	public LogFile getLogFile(String source, Integer team) {
		return logFileRepository.findBySourceAndTeam(source.toLowerCase(), team).orElseThrow();
	}

	public List<Integer> findTeamsBySource(String source) {
		return logFileRepository.findBySource(source.toLowerCase()).stream().map(LogFileRepository.TeamOnly::getTeam)
				.collect(Collectors.toList());
	}

	public LogFile addLogFile(String source, Integer team, MultipartFile file) throws IOException {
		logFileRepository.deleteBySourceAndTeam(source.toLowerCase(), team);
		if (Objects.nonNull(Optional.ofNullable(teamInfoService.getTeamInfoByTeam(team)).orElseThrow())) {
			LogFile logFile = new LogFile();
			logFile.setTeam(team);
			logFile.setSource(source.toLowerCase());
			logFile.setDate(Instant.now());
			logFile.setFile(new Binary(BsonBinarySubType.BINARY, file.getBytes()));
			logFile.setFileExtension(FilenameUtils.getExtension(file.getOriginalFilename()));
			logFile.setFileType(file.getContentType());
			logFile = logFileRepository.insert(logFile);
			return logFile;
		}
		return null;
	}
}
