package fr.vandriessche.rallyeschema.coreservice.controllers;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;
import java.util.List;
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
import org.springframework.http.CacheControl;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import com.fasterxml.jackson.databind.ObjectMapper;

import fr.vandriessche.rallyeschema.coreservice.entities.FormReferenceImage;
import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;
import fr.vandriessche.rallyeschema.coreservice.models.FormRecognitionConfigurationModelAssembler;
import fr.vandriessche.rallyeschema.coreservice.models.GeneratedFormRecognitionConfigurationRequest;
import fr.vandriessche.rallyeschema.coreservice.models.GeneratedChallengeFormConfigurationRequest;
import fr.vandriessche.rallyeschema.coreservice.services.FormRecognitionConfigurationService;
import lombok.extern.java.Log;

@RestController
@Log
public class FormRecognitionConfigurationController {
	public static final String URL = "/formRecognitionConfigurations";

	@Autowired
	private FormRecognitionConfigurationService formRecognitionConfigurationService;

	@PostMapping(URL)
	public EntityModel<FormRecognitionConfiguration> addFormRecognitionConfiguration(
			@RequestParam("formRecognitionConfiguration") String formRecognitionConfigurationJson,
			@RequestParam("formReferenceImage") MultipartFile formReferenceImage,
			FormRecognitionConfigurationModelAssembler assembler) throws ParserConfigurationException, SAXException, IOException {
		FormRecognitionConfiguration formRecognitionConfiguration = new ObjectMapper().readValue(formRecognitionConfigurationJson,
				FormRecognitionConfiguration.class);
		return assembler
				.toModel(formRecognitionConfigurationService.addFormRecognitionConfiguration(formRecognitionConfiguration, formReferenceImage, null));
	}

	@DeleteMapping(URL + "/{id}")
	public void deleteFormRecognitionConfiguration(@PathVariable String id) {
		formRecognitionConfigurationService.deleteCascadeFormRecognitionConfiguration(id);
	}

	@GetMapping(URL + "/{id}/image")
	public ResponseEntity<Resource> downloadFormReferenceImage(@PathVariable String id) {
		FormReferenceImage formReferenceImage = formRecognitionConfigurationService.getFormReferenceImage(id);
		String contentType = formReferenceImage.getFileType();
		if (Objects.isNull(contentType)) {
			contentType = "application/octet-stream";
		}
		return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType(contentType))
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + id + "." + formReferenceImage.getFileExtension() + "\"")
				.body(new ByteArrayResource(formReferenceImage.getFile().getData()));
	}

	@GetMapping(URL + "/{id}/template")
	public ResponseEntity<Resource> downloadSubmittedFormTemplate(@PathVariable String id) {
		FormRecognitionConfiguration formRecognitionConfiguration = formRecognitionConfigurationService.getFormRecognitionConfiguration(id);
		String template = Objects.requireNonNullElse(formRecognitionConfiguration.getTemplate(), "");
		Path path = new File("toto.xml").toPath();
		String contentType = null;
		try {
			contentType = Files.probeContentType(path);
		} catch (IOException e) {
			log.log(Level.WARNING, "downloadSubmittedFormTemplate", e);
		}
		contentType = Objects.requireNonNullElse(contentType, "application/octet-stream");
		return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType))
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + id + ".xtmpl\"")
				.body(new ByteArrayResource(template.getBytes()));
	}

	@GetMapping(URL + "/{id}")
	public EntityModel<FormRecognitionConfiguration> getFormRecognitionConfiguration(@PathVariable String id,
			FormRecognitionConfigurationModelAssembler assembler) {
		return assembler.toModel(formRecognitionConfigurationService.getFormRecognitionConfiguration(id));
	}

	@GetMapping(URL + "/search/findByChallengeAndPage")
	public EntityModel<FormRecognitionConfiguration> getFormRecognitionConfigurationByChallengeAndPage(@RequestParam Integer challenge,
			@RequestParam Integer page, FormRecognitionConfigurationModelAssembler assembler) {
		return assembler
				.toModel(formRecognitionConfigurationService.getFormRecognitionConfigurationByChallengeAndPage(challenge, page).orElseThrow());
	}

	@GetMapping(URL)
	public PagedModel<EntityModel<FormRecognitionConfiguration>> getFormRecognitionConfigurations(Pageable page,
			PagedResourcesAssembler<FormRecognitionConfiguration> pageAssembler, FormRecognitionConfigurationModelAssembler assembler) {
		return pageAssembler.toModel(formRecognitionConfigurationService.getFormRecognitionConfigurations(page), assembler);
	}

	@PutMapping(URL)
	public EntityModel<FormRecognitionConfiguration> updateFormRecognitionConfiguration(
			@RequestParam("formRecognitionConfiguration") String formRecognitionConfigurationJson,
			@RequestParam(name = "formReferenceImage", required = false) MultipartFile formReferenceImage,
			FormRecognitionConfigurationModelAssembler assembler) throws ParserConfigurationException, SAXException, IOException {
		FormRecognitionConfiguration formRecognitionConfiguration = new ObjectMapper().readValue(formRecognitionConfigurationJson,
				FormRecognitionConfiguration.class);
		return assembler
				.toModel(formRecognitionConfigurationService.updateFormRecognitionConfiguration(formRecognitionConfiguration, formReferenceImage));
	}

	@PutMapping(URL + "/generated/challenges/{challenge}")
	public List<FormRecognitionConfiguration> replaceGeneratedChallengeFormRecognitionConfigurations(@PathVariable Integer challenge,
			@RequestBody GeneratedChallengeFormConfigurationRequest request)
			throws ParserConfigurationException, SAXException, IOException {
		return formRecognitionConfigurationService.replaceGeneratedChallengeFormRecognitionConfigurations(challenge, request.getPages());
	}

	@DeleteMapping(URL + "/generated/challenges/{challenge}")
	public void deleteGeneratedChallengeFormRecognitionConfigurations(@PathVariable Integer challenge) {
		formRecognitionConfigurationService.deleteFormRecognitionConfigurationsByChallenge(challenge);
	}

	@GetMapping(URL + "/reference")
	public FormRecognitionConfiguration getReferenceFormRecognitionConfiguration() {
		return formRecognitionConfigurationService.getReferenceFormRecognitionConfiguration().orElse(null);
	}

	@PutMapping(URL + "/reference/generated")
	public FormRecognitionConfiguration saveGeneratedReferenceFormRecognitionConfiguration(
			@RequestBody GeneratedFormRecognitionConfigurationRequest request)
			throws ParserConfigurationException, SAXException, IOException {
		return formRecognitionConfigurationService.saveGeneratedReferenceFormRecognitionConfiguration(request);
	}

	@DeleteMapping(URL + "/reference")
	public void deleteReferenceFormRecognitionConfiguration() {
		formRecognitionConfigurationService.deleteReferenceFormRecognitionConfiguration();
	}
}
