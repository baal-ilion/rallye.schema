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

	@Autowired
	private LogFileService logFileService;

	@DeleteMapping(URL + "/{source}/{team}")
	public void deleteLogFile(@PathVariable String source, @PathVariable Integer team) {
		deleteLogFileP(source, team);
	}

	@DeleteMapping(URL)
	public void deleteLogFileP(@RequestParam String source, @RequestParam Integer team) {
		logFileService.deleteLogFile(source, team);
	}

	@GetMapping(URL + "/{source}/{team}")
	public ResponseEntity<Resource> downloadFile(@PathVariable String source, @PathVariable Integer team,
			HttpServletRequest request) {
		return downloadFileP(source, team, request);
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
						"attachment; filename=\"" + logFile.getId() + "." + logFile.getFileExtension() + "\"")
				.body(new ByteArrayResource(logFile.getFile().getData()));
	}

	@GetMapping(URL + "/{source}")
	public List<Integer> findTeamsBySource(@PathVariable String source) {
		return logFileService.findTeamsBySource(source);
	}

	@PostMapping(URL)
	public String uploadLogFile(@RequestParam String source, @RequestParam Integer team,
			@RequestParam("file") MultipartFile file) {
		try {
			return logFileService.addLogFile(source, team, file).getId();
		} catch (IOException e) {
			log.log(Level.WARNING, "uploadLogFile", e);
		}
		return null;
	}

}
