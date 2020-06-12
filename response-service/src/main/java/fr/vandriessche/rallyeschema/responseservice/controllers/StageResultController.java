package fr.vandriessche.rallyeschema.responseservice.controllers;

import java.io.IOException;
import java.security.InvalidAlgorithmParameterException;

import javax.xml.parsers.ParserConfigurationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.xml.sax.SAXException;

import com.albertoborsetta.formscanner.api.exceptions.FormScannerException;

import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;
import fr.vandriessche.rallyeschema.responseservice.models.StageResultModelAssembler;
import fr.vandriessche.rallyeschema.responseservice.services.StageResultService;

@RestController
public class StageResultController {
	public static final String URL = "/stageResults";

	@Autowired
	private StageResultService stageResultService;

	@PostMapping(URL + "/begin")
	public EntityModel<StageResult> beginStageResult(@RequestParam Integer stage, @RequestParam Integer team,
			StageResultModelAssembler assembler) {
		return assembler.toModel(stageResultService.beginStageResult(stage, team));
	}

	@DeleteMapping(URL + "/begin")
	public EntityModel<StageResult> cancelStageResult(@RequestParam Integer stage, @RequestParam Integer team,
			StageResultModelAssembler assembler) {
		return assembler.toModel(stageResultService.cancelStageResult(stage, team));
	}

	@PostMapping(URL + "/end")
	public EntityModel<StageResult> endStageResult(@RequestParam Integer stage, @RequestParam Integer team,
			StageResultModelAssembler assembler) {
		return assembler.toModel(stageResultService.endStageResult(stage, team));
	}

	@GetMapping(URL + "/{id}")
	public EntityModel<StageResult> getStageResult(@PathVariable String id, StageResultModelAssembler assembler) {
		return assembler.toModel(stageResultService.getStageResult(id));
	}

	@GetMapping(URL + "/search/findByStageAndTeam")
	public EntityModel<StageResult> getStageResultByStageAndTeam(@RequestParam Integer stage,
			@RequestParam Integer team, StageResultModelAssembler assembler) {
		return assembler.toModel(stageResultService.getStageResultByStageAndTeam(stage, team));
	}

	@GetMapping(URL)
	public CollectionModel<EntityModel<StageResult>> getStageResults(StageResultModelAssembler assembler) {
		return assembler.toCollectionModel(stageResultService.getStageResults());
	}

	@GetMapping(URL + "/search/findByTeam")
	public CollectionModel<EntityModel<StageResult>> getStageResultsByTeam(@RequestParam Integer team,
			StageResultModelAssembler assembler) {
		return assembler.toCollectionModel(stageResultService.getStageResultsByTeam(team));
	}

	@PostMapping(URL + "/responseFile")
	public EntityModel<StageResult> selectResponseFile(@RequestParam Integer stage, @RequestParam Integer team,
			@RequestParam(value = "responseFileId") String[] responseFileIds, @RequestParam Boolean delete,
			StageResultModelAssembler assembler) throws InvalidAlgorithmParameterException,
			ParserConfigurationException, SAXException, IOException, FormScannerException {
		return assembler.toModel(stageResultService.selectResponseFile(stage, team, responseFileIds, delete));
	}

	@DeleteMapping(URL + "/end")
	public EntityModel<StageResult> undoStageResult(@RequestParam Integer stage, @RequestParam Integer team,
			StageResultModelAssembler assembler) {
		return assembler.toModel(stageResultService.undoStageResult(stage, team));
	}

	@PatchMapping(URL)
	public EntityModel<StageResult> updateStageResult(@RequestBody StageResult stageResult,
			StageResultModelAssembler assembler) {
		return assembler.toModel(stageResultService.updateStageResult(stageResult));
	}
}
