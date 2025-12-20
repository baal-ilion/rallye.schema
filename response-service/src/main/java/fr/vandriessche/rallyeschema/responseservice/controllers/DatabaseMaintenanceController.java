package fr.vandriessche.rallyeschema.responseservice.controllers;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import fr.vandriessche.rallyeschema.responseservice.services.DatabaseMaintenanceService;
import lombok.extern.java.Log;

@RestController
@RequestMapping({ DatabaseMaintenanceController.URL, DatabaseMaintenanceController.API_URL })
@Log
public class DatabaseMaintenanceController {
	public static final String URL = "/database";
	public static final String API_URL = "/api/database";
	private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

	@Autowired
	private DatabaseMaintenanceService databaseMaintenanceService;

	@GetMapping("/backup")
	public ResponseEntity<StreamingResponseBody> backupDatabase() {
		StreamingResponseBody stream = out -> databaseMaintenanceService.writeBackup(out);
		return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/zip")).header(
				HttpHeaders.CONTENT_DISPOSITION,
				"attachment; filename=\"rallyeschema-database-" + DATE_FORMATTER.format(LocalDateTime.now()) + ".zip\"")
				.body(stream);
	}

	@PostMapping(value = "/restore", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<Void> restoreDatabase(@RequestParam("file") MultipartFile file) throws IOException {
		databaseMaintenanceService.restoreFromBackup(file);
		return ResponseEntity.accepted().build();
	}

	@DeleteMapping
	public ResponseEntity<Void> eraseDatabase() {
		databaseMaintenanceService.eraseDatabase();
		return ResponseEntity.noContent().build();
	}
}
