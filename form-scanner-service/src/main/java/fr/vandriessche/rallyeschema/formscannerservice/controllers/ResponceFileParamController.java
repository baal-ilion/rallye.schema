package fr.vandriessche.rallyeschema.formscannerservice.controllers;

import java.io.IOException;
import java.util.List;

import javax.xml.parsers.ParserConfigurationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.xml.sax.SAXException;

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
	public ResponseEntity<ResponceFileParam> uploadResponceFile(@RequestBody ResponceFileParam responceFileParam)
			throws ParserConfigurationException, SAXException, IOException {
		return ResponseEntity.ok(responceFileParamService.addResponceFileParam(responceFileParam));
	}
}
