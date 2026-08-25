package fr.vandriessche.rallyeschema.coreservice.controllers;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.logging.Level;

import javax.xml.parsers.ParserConfigurationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.xml.sax.SAXException;

import fr.vandriessche.rallyeschema.coreservice.services.SharingService;
import lombok.extern.java.Log;

@RestController
@Log
public class SharingController {
	public static final String URL = "/sharing";

	private static final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
	@Autowired
	private SharingService sharingService;

	@GetMapping(URL + "/configuration")
	public ResponseEntity<StreamingResponseBody> exportConfiguration() {
		StreamingResponseBody stream = out -> sharingService.exportConfigurationArchive(out);
		log.log(Level.FINE, "steaming response {} ", stream);
		return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/zip")).header(
				HttpHeaders.CONTENT_DISPOSITION,
				"attachment; filename=\"rallyeschema-configuration-" + dateFormatter.format(LocalDateTime.now()) + ".zip\"")
				.body(stream);
	}

	@PostMapping(URL + "/configuration")
	public void importConfiguration(@RequestParam("file") MultipartFile file)
			throws IOException, ParserConfigurationException, SAXException {
		sharingService.importConfigurationArchive(file);
	}
}
