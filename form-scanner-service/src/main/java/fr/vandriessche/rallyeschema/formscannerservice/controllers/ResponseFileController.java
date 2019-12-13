package fr.vandriessche.rallyeschema.formscannerservice.controllers;

import java.io.IOException;
import java.util.Arrays;
import java.util.Objects;
import java.util.stream.Collectors;

import javax.servlet.http.HttpServletRequest;
import javax.xml.parsers.ParserConfigurationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
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
import fr.vandriessche.rallyeschema.formscannerservice.models.ResponseFileInfoModelAssembler;
import fr.vandriessche.rallyeschema.formscannerservice.services.ResponseFileService;

@RestController
public class ResponseFileController {
	@Autowired
	private ResponseFileService responseFileService;

	public static final String URL = "/responseFiles";
	public static final String INFO_URL = "/responseFileInfos";

	@PostMapping(URL)
	public EntityModel<ResponseFileInfo> uploadResponseFile(@RequestParam("file") MultipartFile file,
			ResponseFileInfoModelAssembler assembler) {
		try {
			return assembler.toModel(responseFileService.addResponseFile(file).getInfo());
		} catch (IOException | ParserConfigurationException | SAXException | FormScannerException e) {
			// TODO Bloc catch généré automatiquement
			e.printStackTrace();
		}
		return null;
	}

	@PostMapping(URL + "/multiple")
	public CollectionModel<EntityModel<ResponseFileInfo>> uploadMultipleResponseFiles(
			@RequestParam("files") MultipartFile[] files, ResponseFileInfoModelAssembler assembler) {
		return assembler.toCollectionModel(Arrays.asList(files).stream().map(file -> {
			try {
				return responseFileService.addResponseFile(file).getInfo();
			} catch (IOException | ParserConfigurationException | SAXException | FormScannerException e) {
				// TODO Bloc catch généré automatiquement
				e.printStackTrace();
			}
			return null;
		}).filter(Objects::nonNull).collect(Collectors.toList()));
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

	@GetMapping(INFO_URL)
	public CollectionModel<EntityModel<ResponseFileInfo>> getResponseFileInfos(
			ResponseFileInfoModelAssembler assembler) {
		return assembler.toCollectionModel(responseFileService.getResponseFileInfos());
	}

	@GetMapping(INFO_URL + "/search/findByStageAndTeam")
	public CollectionModel<EntityModel<ResponseFileInfo>> getResponseFileInfosByStageAndTeam(
			@RequestParam Integer stage, @RequestParam Integer team, ResponseFileInfoModelAssembler assembler) {
		return assembler.toCollectionModel(responseFileService.getResponseFileInfosByStageAndTeam(stage, team));
	}

	@GetMapping(INFO_URL + "/{id}")
	public EntityModel<ResponseFileInfo> getResponseFileInfo(@PathVariable String id,
			ResponseFileInfoModelAssembler assembler) {
		return assembler.toModel(responseFileService.getResponseFileInfo(id));
	}

	@PatchMapping(INFO_URL)
	public EntityModel<ResponseFileInfo> updateResponseFileInfo(@RequestBody ResponseFileInfo responseFileInfo,
			ResponseFileInfoModelAssembler assembler)
			throws ParserConfigurationException, SAXException, IOException, FormScannerException {
		return assembler.toModel(responseFileService.updateResponseFileInfo(responseFileInfo));
	}
}
