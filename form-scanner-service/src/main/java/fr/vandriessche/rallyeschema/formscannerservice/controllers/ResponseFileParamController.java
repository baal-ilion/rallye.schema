package fr.vandriessche.rallyeschema.formscannerservice.controllers;

import java.io.IOException;
import java.util.List;
import java.util.Objects;

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

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileModel;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.formscannerservice.services.ResponseFileParamService;

@RestController
public class ResponseFileParamController {
	@Autowired
	private ResponseFileParamService responseFileParamService;

	@GetMapping("/responseFileParams")
	public List<ResponseFileParam> getResponseFileParams() {
		return responseFileParamService.getResponseFileParams();
	}

	@GetMapping("/responseFileParam/search/findByStageAndPage")
	public ResponseFileParam getResponseFileParamByStageAndPage(@RequestParam Integer stage,
			@RequestParam Integer page) {
		return responseFileParamService.getResponseFileParamByStageAndPage(stage, page).orElseThrow();
	}

	@GetMapping("/responseFileParam/{id}")
	public ResponseEntity<ResponseFileParam> getResponseFileParam(@PathVariable String id) {
		return ResponseEntity.ok(responseFileParamService.getResponseFileParam(id));
	}

	@PostMapping("/responseFileParam")
	public ResponseEntity<ResponseFileParam> addResponseFileParam(
			@RequestParam("responseFileParam") String responseFileParamJson,
			@RequestParam("responseFileModel") MultipartFile responseFileModel)
			throws ParserConfigurationException, SAXException, IOException {
		ResponseFileParam responseFileParam = new ObjectMapper().readValue(responseFileParamJson,
				ResponseFileParam.class);
		return ResponseEntity.ok(responseFileParamService.addResponseFileParam(responseFileParam, responseFileModel));
	}

	@PutMapping("/responseFileParam")
	public ResponseEntity<ResponseFileParam> updateResponseFileParam(
			@RequestParam("responseFileParam") String responseFileParamJson,
			@RequestParam(name = "responseFileModel", required = false) MultipartFile responseFileModel)
			throws ParserConfigurationException, SAXException, IOException {
		ResponseFileParam responseFileParam = new ObjectMapper().readValue(responseFileParamJson,
				ResponseFileParam.class);
		return ResponseEntity
				.ok(responseFileParamService.updateResponseFileParam(responseFileParam, responseFileModel));
	}

	@GetMapping("/responseFileModel/{id}")
	public ResponseEntity<Resource> downloadResponseFileModel(@PathVariable String id, HttpServletRequest request) {
		ResponseFileModel responseFileModel = responseFileParamService.getResponseFileModel(id);
		String contentType = responseFileModel.getFileType();
		if (Objects.isNull(contentType)) {
			contentType = "application/octet-stream";
		}
		return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType))
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + id + "." + responseFileModel.getFileExtension() + "\"")
				.body(new ByteArrayResource(responseFileModel.getFile().getData()));
	}
}
