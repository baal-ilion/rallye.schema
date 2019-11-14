package fr.vandriessche.rallyeschema.formscannerservice.controllers;

import java.io.IOException;
import java.util.List;

import javax.servlet.http.HttpServletRequest;
import javax.xml.parsers.ParserConfigurationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import com.fasterxml.jackson.databind.ObjectMapper;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFileModel;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFileParam;
import fr.vandriessche.rallyeschema.formscannerservice.services.ResponceFileParamService;

@RestController
public class ResponceFileParamController {
	@Autowired
	private ResponceFileParamService responceFileParamService;

	@GetMapping("/responceFileParams")
	public List<ResponceFileParam> getResponceFileParams() {
		return responceFileParamService.getResponceFileParams();
	}

	@GetMapping("/responceFileParam/search/findByStageAndPage")
	public ResponceFileParam getResponceFileParamByStageAndPage(@RequestParam Integer stage,
			@RequestParam Integer page) {
		return responceFileParamService.getResponceFileParamByStageAndPage(stage, page).orElseThrow();
	}

	@GetMapping("/responceFileParam/{id}")
	public ResponseEntity<ResponceFileParam> getResponceFileParam(@PathVariable String id) {
		return ResponseEntity.ok(responceFileParamService.getResponceFileParam(id));
	}

	@PostMapping("/responceFileParam")
	public ResponseEntity<ResponceFileParam> addResponceFileParam(
			@RequestParam("responceFileParam") String responceFileParamJson,
			@RequestParam("responceFileModel") MultipartFile responceFileModel)
			throws ParserConfigurationException, SAXException, IOException {
		ResponceFileParam responceFileParam = new ObjectMapper().readValue(responceFileParamJson,
				ResponceFileParam.class);
		return ResponseEntity.ok(responceFileParamService.addResponceFileParam(responceFileParam, responceFileModel));
	}

	@PutMapping("/responceFileParam")
	public ResponseEntity<ResponceFileParam> updateResponceFileParam(
			@RequestParam("responceFileParam") String responceFileParamJson,
			@RequestParam(name = "responceFileModel", required = false) MultipartFile responceFileModel)
			throws ParserConfigurationException, SAXException, IOException {
		ResponceFileParam responceFileParam = new ObjectMapper().readValue(responceFileParamJson,
				ResponceFileParam.class);
		return ResponseEntity
				.ok(responceFileParamService.updateResponceFileParam(responceFileParam, responceFileModel));
	}

	@GetMapping("/responceFileModel/{id}")
	public ResponseEntity<Resource> downloadResponceFileModel(@PathVariable String id, HttpServletRequest request) {
		ResponceFileModel responceFileModel = responceFileParamService.getResponceFileModel(id);
		String contentType = responceFileModel.getFileType();
		if (contentType == null) {
			contentType = "application/octet-stream";
		}
		return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType))
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + id + "." + responceFileModel.getFileExtension() + "\"")
				.body(new ByteArrayResource(responceFileModel.getFile().getData()));
	}
}
