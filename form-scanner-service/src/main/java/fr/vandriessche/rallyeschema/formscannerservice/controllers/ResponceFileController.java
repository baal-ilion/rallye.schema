package fr.vandriessche.rallyeschema.formscannerservice.controllers;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import javax.servlet.http.HttpServletRequest;
import javax.xml.parsers.ParserConfigurationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import com.albertoborsetta.formscanner.api.exceptions.FormScannerException;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFile;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFileInfo;
import fr.vandriessche.rallyeschema.formscannerservice.services.ResponceFileService;

@RestController
public class ResponceFileController {
	@Autowired
	private ResponceFileService responceFileService;

	@PostMapping("/uploadResponceFile")
	public String uploadResponceFile(@RequestParam("file") MultipartFile file) {
		String id = null;
		try {
			id = responceFileService.addResponceFile(file);
		} catch (IOException e) {
			// TODO Bloc catch généré automatiquement
			e.printStackTrace();
		} catch (ParserConfigurationException e) {
			// TODO Bloc catch généré automatiquement
			e.printStackTrace();
		} catch (SAXException e) {
			// TODO Bloc catch généré automatiquement
			e.printStackTrace();
		} catch (FormScannerException e) {
			// TODO Bloc catch généré automatiquement
			e.printStackTrace();
		}

		/*
		 * String fileDownloadUri =
		 * ServletUriComponentsBuilder.fromCurrentContextPath().path("/downloadFile/")
		 * .path(fileName).toUriString();
		 */

		return id;
	}

	@PostMapping("/uploadMultipleResponceFiles")
	public List<String> uploadMultipleResponceFiles(@RequestParam("files") MultipartFile[] files) {
		return Arrays.asList(files).stream().map(file -> uploadResponceFile(file)).collect(Collectors.toList());
	}

	@GetMapping("/downloadResponceFile/{id}")
	public ResponseEntity<Resource> downloadFile(@PathVariable String id, HttpServletRequest request) {
		ResponceFile responceFile = responceFileService.getResponceFile(id);
		String contentType = responceFile.getFileType();
		if (contentType == null) {
			contentType = "application/octet-stream";
		}
		return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType))
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + id + "." + responceFile.getFileExtension() + "\"")
				.body(new ByteArrayResource(responceFile.getFile().getData()));
	}

	@GetMapping("/responceFileInfos")
	public List<ResponceFileInfo> getResponceFileInfos() {
		return responceFileService.getResponceFileInfos();
	}

	@GetMapping("/responceFileInfos/search/findByStageAndTeam")
	public List<ResponceFileInfo> getResponceFileInfosByStageAndTeam(@RequestParam Integer stage,
			@RequestParam Integer team) {
		return responceFileService.getResponceFileInfosByStageAndTeam(stage, team);
	}

	@GetMapping("/responceFileInfo/{id}")
	public ResponseEntity<ResponceFileInfo> getResponceFileInfo(@PathVariable String id) {
		return ResponseEntity.ok(responceFileService.getResponceFileInfo(id));
	}

	@PatchMapping("/responceFileInfo")
	public ResponseEntity<ResponceFileInfo> updateResponceFileInfo(@RequestBody ResponceFileInfo responceFileInfo)
			throws ParserConfigurationException, SAXException, IOException, FormScannerException {
		return ResponseEntity.ok(responceFileService.updateResponceFileInfo(responceFileInfo));
	}
}
