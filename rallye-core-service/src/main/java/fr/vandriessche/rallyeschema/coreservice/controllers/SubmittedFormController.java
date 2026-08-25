package fr.vandriessche.rallyeschema.coreservice.controllers;

import java.io.IOException;
import java.util.Arrays;
import java.time.Duration;
import java.util.Objects;
import java.util.logging.Level;
import java.util.stream.Collectors;

import javax.servlet.http.HttpServletRequest;
import javax.xml.parsers.ParserConfigurationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedForm;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormSummary;
import fr.vandriessche.rallyeschema.coreservice.models.SubmittedFormMetadataModelAssembler;
import fr.vandriessche.rallyeschema.coreservice.services.SubmittedFormService;
import lombok.extern.java.Log;

@RestController
@Log
public class SubmittedFormController {
	public static final String URL = "/submittedForms";
	public static final String INFO_URL = "/submittedFormsMetadata";

	@Autowired
	private SubmittedFormService submittedFormService;

	@DeleteMapping(URL + "/{id}")
	public void deleteSubmittedForm(@PathVariable String id) {
		submittedFormService.deleteSubmittedForm(id);
	}

	@GetMapping(URL + "/{id}")
	public ResponseEntity<Resource> downloadFile(@PathVariable String id, HttpServletRequest request) {
		SubmittedForm submittedForm = submittedFormService.getSubmittedForm(id);
		String contentType = submittedForm.getFileType();
		if (Objects.isNull(contentType)) {
			contentType = "application/octet-stream";
		}
		return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType))
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + id + "." + submittedForm.getFileExtension() + "\"")
				.body(new ByteArrayResource(submittedForm.getFile().getData()));
	}

	@GetMapping(INFO_URL + "/{id}")
	public EntityModel<SubmittedFormMetadata> getSubmittedFormMetadata(@PathVariable String id,
			SubmittedFormMetadataModelAssembler assembler) {
		return assembler.toModel(submittedFormService.getSubmittedFormMetadata(id));
	}

	@GetMapping(INFO_URL)
	public CollectionModel<EntityModel<SubmittedFormMetadata>> getSubmittedFormMetadatas(
			SubmittedFormMetadataModelAssembler assembler) {
		return assembler.toCollectionModel(submittedFormService.getSubmittedFormMetadatas());
	}

	@GetMapping(INFO_URL + "/search/findByChallengeAndPageAndTeam")
	public CollectionModel<EntityModel<SubmittedFormMetadata>> getSubmittedFormMetadatasByChallengeAndPageAndTeam(
			@RequestParam Integer challenge, @RequestParam Integer page, @RequestParam Integer team,
			SubmittedFormMetadataModelAssembler assembler) {
		return assembler
				.toCollectionModel(submittedFormService.getSubmittedFormMetadatasByChallengeAndPageAndTeam(challenge, page, team));
	}

	@GetMapping(INFO_URL + "/search/findByChallengeAndTeam")
	public CollectionModel<EntityModel<SubmittedFormMetadata>> getSubmittedFormMetadatasByChallengeAndTeam(
			@RequestParam Integer challenge, @RequestParam Integer team, SubmittedFormMetadataModelAssembler assembler) {
		return assembler.toCollectionModel(submittedFormService.getSubmittedFormMetadatasByChallengeAndTeam(challenge, team));
	}

	@GetMapping(INFO_URL + "/search/findByCheckedIsFalse")
	public PagedModel<EntityModel<SubmittedFormMetadata>> getFormRecognitionConfigurations(Pageable page,
			@RequestParam(required = false) String leaseOwner,
			PagedResourcesAssembler<SubmittedFormMetadata> pageAssembler, SubmittedFormMetadataModelAssembler assembler) {
		return pageAssembler.toModel(submittedFormService.getNotCheckedSubmittedFormMetadatas(page, leaseOwner), assembler);
	}

	@GetMapping(INFO_URL + "/processing-queue")
	public org.springframework.data.domain.Page<SubmittedFormSummary> getProcessingQueue(Pageable page,
			@RequestParam(required = false) String status, @RequestParam(required = false) String owner) {
		return submittedFormService.getProcessingQueue(page, status, owner);
	}

	@GetMapping(URL + "/{id}/thumbnail")
	public ResponseEntity<Resource> downloadThumbnail(@PathVariable String id, WebRequest request) {
		SubmittedForm submittedForm = submittedFormService.getSubmittedFormWithCompactThumbnail(id);
		byte[] data = submittedForm.getThumbnail() == null
				? submittedForm.getFile().getData()
				: submittedForm.getThumbnail().getData();
		String contentType = submittedForm.getThumbnail() == null
				? submittedForm.getFileType()
				: submittedForm.getThumbnailType();
		String etag = "\"" + Integer.toHexString(Arrays.hashCode(data)) + "\"";
		if (request.checkNotModified(etag))
			return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).build();
		return ResponseEntity.ok()
				.cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePrivate())
				.eTag(etag)
				.contentType(MediaType.parseMediaType(contentType))
				.body(new ByteArrayResource(data));
	}

	@PostMapping(INFO_URL + "/{id}/verification-lease")
	public EntityModel<SubmittedFormMetadata> claimForVerification(@PathVariable String id, @RequestParam String owner,
			SubmittedFormMetadataModelAssembler assembler) {
		try {
			return assembler.toModel(submittedFormService.claimForVerification(id, owner));
		} catch (IllegalStateException exception) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, exception.getMessage(), exception);
		}
	}

	@PatchMapping(INFO_URL + "/{id}/verification-lease")
	public EntityModel<SubmittedFormMetadata> renewVerificationLease(@PathVariable String id, @RequestParam String owner,
			SubmittedFormMetadataModelAssembler assembler) {
		try {
			return assembler.toModel(submittedFormService.renewVerificationLease(id, owner));
		} catch (IllegalStateException exception) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, exception.getMessage(), exception);
		}
	}

	@DeleteMapping(INFO_URL + "/{id}/verification-lease")
	public void releaseVerificationLease(@PathVariable String id, @RequestParam String owner) {
		submittedFormService.releaseVerificationLease(id, owner);
	}

	@GetMapping(INFO_URL + "/{id}/same")
	public CollectionModel<EntityModel<SubmittedFormMetadata>> getSameSubmittedFormMetadatas(@PathVariable String id,
			SubmittedFormMetadataModelAssembler assembler) {
		return assembler.toCollectionModel(submittedFormService.getSameSubmittedFormMetadatas(id));
	}

	@PatchMapping(INFO_URL)
	public EntityModel<SubmittedFormMetadata> updateSubmittedFormMetadata(@RequestBody SubmittedFormMetadata submittedFormMetadata,
			SubmittedFormMetadataModelAssembler assembler)
			throws ParserConfigurationException, SAXException, IOException {
		return assembler.toModel(submittedFormService.updateSubmittedFormMetadata(submittedFormMetadata));
	}

	@PostMapping(URL + "/multiple")
	public CollectionModel<EntityModel<SubmittedFormMetadata>> uploadMultipleSubmittedForms(
			@RequestParam("files") MultipartFile[] files, SubmittedFormMetadataModelAssembler assembler) {
		return assembler.toCollectionModel(Arrays.asList(files).stream().map(file -> {
			try {
				return submittedFormService.addSubmittedForm(file).getMetadata();
			} catch (IOException | ParserConfigurationException | SAXException e) {
				log.log(Level.WARNING, "uploadMultipleSubmittedForms", e);
			}
			return null;
		}).filter(Objects::nonNull).collect(Collectors.toList()));
	}

	@PostMapping(URL)
	public EntityModel<SubmittedFormMetadata> uploadSubmittedForm(@RequestParam("file") MultipartFile file,
			@RequestHeader(value = "X-Upload-Id", required = false) String uploadId,
			SubmittedFormMetadataModelAssembler assembler) {
		try {
			return assembler.toModel(submittedFormService.addSubmittedForm(file, uploadId).getMetadata());
		} catch (IOException | ParserConfigurationException | SAXException e) {
			log.log(Level.WARNING, "uploadSubmittedForm", e);
		}
		return null;
	}

	@PostMapping(URL + "/{id}/retry")
	public EntityModel<SubmittedFormMetadata> retrySubmittedForm(@PathVariable String id,
			SubmittedFormMetadataModelAssembler assembler) {
		return assembler.toModel(submittedFormService.retryProcessing(id));
	}

}
