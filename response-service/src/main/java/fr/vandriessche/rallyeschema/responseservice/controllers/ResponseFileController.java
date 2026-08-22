package fr.vandriessche.rallyeschema.responseservice.controllers;

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

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFile;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileSummary;
import fr.vandriessche.rallyeschema.responseservice.models.ResponseFileInfoModelAssembler;
import fr.vandriessche.rallyeschema.responseservice.services.ResponseFileService;
import lombok.extern.java.Log;

@RestController
@Log
public class ResponseFileController {
	public static final String URL = "/responseFiles";
	public static final String INFO_URL = "/responseFileInfos";

	@Autowired
	private ResponseFileService responseFileService;

	@DeleteMapping(URL + "/{id}")
	public void deleteResponseFile(@PathVariable String id) {
		responseFileService.deleteResponseFile(id);
	}

	@GetMapping(URL + "/{id}")
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

	@GetMapping(INFO_URL + "/{id}")
	public EntityModel<ResponseFileInfo> getResponseFileInfo(@PathVariable String id,
			ResponseFileInfoModelAssembler assembler) {
		return assembler.toModel(responseFileService.getResponseFileInfo(id));
	}

	@GetMapping(INFO_URL)
	public CollectionModel<EntityModel<ResponseFileInfo>> getResponseFileInfos(
			ResponseFileInfoModelAssembler assembler) {
		return assembler.toCollectionModel(responseFileService.getResponseFileInfos());
	}

	@GetMapping(INFO_URL + "/search/findByStageAndPageAndTeam")
	public CollectionModel<EntityModel<ResponseFileInfo>> getResponseFileInfosByStageAndPageAndTeam(
			@RequestParam Integer stage, @RequestParam Integer page, @RequestParam Integer team,
			ResponseFileInfoModelAssembler assembler) {
		return assembler
				.toCollectionModel(responseFileService.getResponseFileInfosByStageAndPageAndTeam(stage, page, team));
	}

	@GetMapping(INFO_URL + "/search/findByStageAndTeam")
	public CollectionModel<EntityModel<ResponseFileInfo>> getResponseFileInfosByStageAndTeam(
			@RequestParam Integer stage, @RequestParam Integer team, ResponseFileInfoModelAssembler assembler) {
		return assembler.toCollectionModel(responseFileService.getResponseFileInfosByStageAndTeam(stage, team));
	}

	@GetMapping(INFO_URL + "/search/findByCheckedIsFalse")
	public PagedModel<EntityModel<ResponseFileInfo>> getResponseFileParams(Pageable page,
			@RequestParam(required = false) String leaseOwner,
			PagedResourcesAssembler<ResponseFileInfo> pageAssembler, ResponseFileInfoModelAssembler assembler) {
		return pageAssembler.toModel(responseFileService.getNotCheckedResponseFileInfos(page, leaseOwner), assembler);
	}

	@GetMapping(INFO_URL + "/processing-queue")
	public org.springframework.data.domain.Page<ResponseFileSummary> getProcessingQueue(Pageable page,
			@RequestParam(required = false) String status, @RequestParam(required = false) String owner) {
		return responseFileService.getProcessingQueue(page, status, owner);
	}

	@GetMapping(URL + "/{id}/thumbnail")
	public ResponseEntity<Resource> downloadThumbnail(@PathVariable String id, WebRequest request) {
		ResponseFile responseFile = responseFileService.getResponseFileWithCompactThumbnail(id);
		byte[] data = responseFile.getThumbnail() == null
				? responseFile.getFile().getData()
				: responseFile.getThumbnail().getData();
		String contentType = responseFile.getThumbnail() == null
				? responseFile.getFileType()
				: responseFile.getThumbnailType();
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
	public EntityModel<ResponseFileInfo> claimForVerification(@PathVariable String id, @RequestParam String owner,
			ResponseFileInfoModelAssembler assembler) {
		try {
			return assembler.toModel(responseFileService.claimForVerification(id, owner));
		} catch (IllegalStateException exception) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, exception.getMessage(), exception);
		}
	}

	@PatchMapping(INFO_URL + "/{id}/verification-lease")
	public EntityModel<ResponseFileInfo> renewVerificationLease(@PathVariable String id, @RequestParam String owner,
			ResponseFileInfoModelAssembler assembler) {
		try {
			return assembler.toModel(responseFileService.renewVerificationLease(id, owner));
		} catch (IllegalStateException exception) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, exception.getMessage(), exception);
		}
	}

	@DeleteMapping(INFO_URL + "/{id}/verification-lease")
	public void releaseVerificationLease(@PathVariable String id, @RequestParam String owner) {
		responseFileService.releaseVerificationLease(id, owner);
	}

	@GetMapping(INFO_URL + "/{id}/same")
	public CollectionModel<EntityModel<ResponseFileInfo>> getSameResponseFileInfos(@PathVariable String id,
			ResponseFileInfoModelAssembler assembler) {
		return assembler.toCollectionModel(responseFileService.getSameResponseFileInfos(id));
	}

	@PatchMapping(INFO_URL)
	public EntityModel<ResponseFileInfo> updateResponseFileInfo(@RequestBody ResponseFileInfo responseFileInfo,
			ResponseFileInfoModelAssembler assembler)
			throws ParserConfigurationException, SAXException, IOException {
		return assembler.toModel(responseFileService.updateResponseFileInfo(responseFileInfo));
	}

	@PostMapping(URL + "/multiple")
	public CollectionModel<EntityModel<ResponseFileInfo>> uploadMultipleResponseFiles(
			@RequestParam("files") MultipartFile[] files, ResponseFileInfoModelAssembler assembler) {
		return assembler.toCollectionModel(Arrays.asList(files).stream().map(file -> {
			try {
				return responseFileService.addResponseFile(file).getInfo();
			} catch (IOException | ParserConfigurationException | SAXException e) {
				log.log(Level.WARNING, "uploadMultipleResponseFiles", e);
			}
			return null;
		}).filter(Objects::nonNull).collect(Collectors.toList()));
	}

	@PostMapping(URL)
	public EntityModel<ResponseFileInfo> uploadResponseFile(@RequestParam("file") MultipartFile file,
			@RequestHeader(value = "X-Upload-Id", required = false) String uploadId,
			ResponseFileInfoModelAssembler assembler) {
		try {
			return assembler.toModel(responseFileService.addResponseFile(file, uploadId).getInfo());
		} catch (IOException | ParserConfigurationException | SAXException e) {
			log.log(Level.WARNING, "uploadResponseFile", e);
		}
		return null;
	}

	@PostMapping(URL + "/{id}/retry")
	public EntityModel<ResponseFileInfo> retryResponseFile(@PathVariable String id,
			ResponseFileInfoModelAssembler assembler) {
		return assembler.toModel(responseFileService.retryProcessing(id));
	}

}
