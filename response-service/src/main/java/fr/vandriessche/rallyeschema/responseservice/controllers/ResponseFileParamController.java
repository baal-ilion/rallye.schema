package fr.vandriessche.rallyeschema.responseservice.controllers;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;
import java.util.logging.Level;

import javax.xml.parsers.ParserConfigurationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import com.fasterxml.jackson.databind.ObjectMapper;

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileModel;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.responseservice.models.ResponseFileParamModelAssembler;
import fr.vandriessche.rallyeschema.responseservice.services.ResponseFileParamService;
import lombok.extern.java.Log;

@RestController
@Log
public class ResponseFileParamController {
	public static final String URL = "/responseFileParams";

	@Autowired
	private ResponseFileParamService responseFileParamService;

	@PostMapping(URL)
	public EntityModel<ResponseFileParam> addResponseFileParam(
			@RequestParam("responseFileParam") String responseFileParamJson,
			@RequestParam("responseFileModel") MultipartFile responseFileModel,
			ResponseFileParamModelAssembler assembler) throws ParserConfigurationException, SAXException, IOException {
		ResponseFileParam responseFileParam = new ObjectMapper().readValue(responseFileParamJson,
				ResponseFileParam.class);
		return assembler.toModel(responseFileParamService.addResponseFileParam(responseFileParam, responseFileModel));
	}

	@DeleteMapping(URL + "/{id}")
	public void deleteResponseFileParam(@PathVariable String id) {
		responseFileParamService.deleteCascadeResponseFileParam(id);
	}

	@GetMapping(URL + "/{id}/model")
	public ResponseEntity<Resource> downloadResponseFileModel(@PathVariable String id) {
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

	@GetMapping(URL + "/{id}/template")
	public ResponseEntity<Resource> downloadResponseFileTemplate(@PathVariable String id) {
		ResponseFileParam responseFileParam = responseFileParamService.getResponseFileParam(id);
		Path path = new File("toto.xml").toPath();
		String contentType = null;
		try {
			contentType = Files.probeContentType(path);
		} catch (IOException e) {
			log.log(Level.WARNING, "downloadResponseFileTemplate", e);
		}
		if (Objects.isNull(contentType)) {
			contentType = "application/octet-stream";
		}
		return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType))
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + id + ".xtmpl\"")
				.body(new ByteArrayResource(responseFileParam.getTemplate().getBytes()));
	}

	@GetMapping(URL + "/{id}")
	public EntityModel<ResponseFileParam> getResponseFileParam(@PathVariable String id,
			ResponseFileParamModelAssembler assembler) {
		return assembler.toModel(responseFileParamService.getResponseFileParam(id));
	}

	@GetMapping(URL + "/search/findByStageAndPage")
	public EntityModel<ResponseFileParam> getResponseFileParamByStageAndPage(@RequestParam Integer stage,
			@RequestParam Integer page, ResponseFileParamModelAssembler assembler) {
		return assembler
				.toModel(responseFileParamService.getResponseFileParamByStageAndPage(stage, page).orElseThrow());
	}

	@GetMapping(URL)
	public PagedModel<EntityModel<ResponseFileParam>> getResponseFileParams(Pageable page,
			PagedResourcesAssembler<ResponseFileParam> pageAssembler, ResponseFileParamModelAssembler assembler) {
		return pageAssembler.toModel(responseFileParamService.getResponseFileParams(page), assembler);
	}

	@PutMapping(URL)
	public EntityModel<ResponseFileParam> updateResponseFileParam(
			@RequestParam("responseFileParam") String responseFileParamJson,
			@RequestParam(name = "responseFileModel", required = false) MultipartFile responseFileModel,
			ResponseFileParamModelAssembler assembler) throws ParserConfigurationException, SAXException, IOException {
		ResponseFileParam responseFileParam = new ObjectMapper().readValue(responseFileParamJson,
				ResponseFileParam.class);
		return assembler
				.toModel(responseFileParamService.updateResponseFileParam(responseFileParam, responseFileModel));
	}
}
