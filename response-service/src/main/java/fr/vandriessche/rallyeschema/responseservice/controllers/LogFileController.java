package fr.vandriessche.rallyeschema.responseservice.controllers;

import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;

import javax.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import fr.vandriessche.rallyeschema.responseservice.entities.LogFile;
import fr.vandriessche.rallyeschema.responseservice.services.LogFileService;
import lombok.extern.java.Log;

@RestController
@Log
public class LogFileController {
	public static final String URL = "/logFiles";
	public static final String DEFAULT_SOURCE = "mobileStage";
	@Autowired
	private LogFileService logFileService;

	@DeleteMapping(URL + "/" + DEFAULT_SOURCE + "/{team}")
	public void deleteLogFile(@PathVariable Integer team) {
		deleteLogFileP(DEFAULT_SOURCE, team);
	}

	@DeleteMapping(URL)
	public void deleteLogFileP(@RequestParam String source, @RequestParam Integer team) {
		logFileService.deleteLogFile(source, team);
	}

	@GetMapping(URL + "/" + DEFAULT_SOURCE + "/{team}")
	public ResponseEntity<Resource> downloadFile(@PathVariable Integer team, HttpServletRequest request) {
		return downloadFileP(DEFAULT_SOURCE, team, request);
	}

	@GetMapping(URL)
	public ResponseEntity<Resource> downloadFileP(@RequestParam String source, @RequestParam Integer team,
			HttpServletRequest request) {
		LogFile logFile = logFileService.getLogFile(source, team);
		String contentType = logFile.getFileType();
		if (Objects.isNull(contentType)) {
			contentType = "application/octet-stream";
		}
		return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType))
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + logFile.getSource() + "_" + logFile.getTeam().toString() + "_"
								+ logFile.getId() + "." + logFile.getFileExtension() + "\"")
				.body(new ByteArrayResource(logFile.getFile().getData()));
	}

	@GetMapping(URL + "/" + DEFAULT_SOURCE)
	public List<Integer> findTeamsBySource() {
		return logFileService.findTeamsBySource(DEFAULT_SOURCE);
	}

	@PostMapping(URL)
	public String uploadLogFile(@RequestParam(defaultValue = "mobileStage") String source, @RequestParam Integer team,
			@RequestParam("file") MultipartFile file) {
		try {
			return logFileService.addLogFile(source, team, file).getId();
		} catch (IOException e) {
			log.log(Level.WARNING, "uploadLogFile", e);
		}
		return null;
	}

}
