package fr.vandriessche.rallyeschema.formscannerservice.controllers;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
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

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFile;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.formscannerservice.services.ResponseFileService;

@RestController
public class ResponseFileController {
	@Autowired
	private ResponseFileService responseFileService;

	@PostMapping("/uploadResponseFile")
	public ResponseFileInfo uploadResponseFile(@RequestParam("file") MultipartFile file) {
		try {
			return responseFileService.addResponseFile(file).getInfo();
		} catch (IOException | ParserConfigurationException | SAXException | FormScannerException e) {
			// TODO Bloc catch généré automatiquement
			e.printStackTrace();
		}
		return null;
	}

	@PostMapping("/uploadMultipleResponseFiles")
	public List<ResponseFileInfo> uploadMultipleResponseFiles(@RequestParam("files") MultipartFile[] files) {
		return Arrays.asList(files).stream().map(file -> uploadResponseFile(file)).filter(Objects::nonNull)
				.collect(Collectors.toList());
	}

	@GetMapping("/downloadResponseFile/{id}")
	public ResponseEntity<Resource> downloadFile(@PathVariable String id, HttpServletRequest request) {
		ResponseFile responseFile = responseFileService.getResponseFile(id);
		String contentType = responseFile.getFileType();
		if (Objects.isNull(contentType)) {
			contentType = "application/octet-stream";
		}
		return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType))
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + id + "." + responseFile.getFileExtension() + "\"")
				.body(new ByteArrayResource(responseFile.getFile().getData()));
	}

	@GetMapping("/responseFileInfos")
	public List<ResponseFileInfo> getResponseFileInfos() {
		return responseFileService.getResponseFileInfos();
	}

	@GetMapping("/responseFileInfos/search/findByStageAndTeam")
	public List<ResponseFileInfo> getResponseFileInfosByStageAndTeam(@RequestParam Integer stage,
			@RequestParam Integer team) {
		return responseFileService.getResponseFileInfosByStageAndTeam(stage, team);
	}

	@GetMapping("/responseFileInfo/{id}")
	public ResponseEntity<ResponseFileInfo> getResponseFileInfo(@PathVariable String id) {
		return ResponseEntity.ok(responseFileService.getResponseFileInfo(id));
	}

	@PatchMapping("/responseFileInfo")
	public ResponseEntity<ResponseFileInfo> updateResponseFileInfo(@RequestBody ResponseFileInfo responseFileInfo)
			throws ParserConfigurationException, SAXException, IOException, FormScannerException {
		return ResponseEntity.ok(responseFileService.updateResponseFileInfo(responseFileInfo));
	}
}
