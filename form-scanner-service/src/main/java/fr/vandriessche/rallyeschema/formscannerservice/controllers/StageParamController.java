package fr.vandriessche.rallyeschema.formscannerservice.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.formscannerservice.entities.StageParam;
import fr.vandriessche.rallyeschema.formscannerservice.models.StageParamModel;
import fr.vandriessche.rallyeschema.formscannerservice.models.StageParamModelAssemblerSupport;
import fr.vandriessche.rallyeschema.formscannerservice.services.StageParamService;

@RestController
public class StageParamController {
	public static final String URL = "/stageParams";

	@Autowired
	private StageParamService stageParamService;

	@PostMapping(URL)
	public StageParamModel addStageParam(@RequestBody StageParam stageParam,
			StageParamModelAssemblerSupport assembler) {
		return assembler.toModel(stageParamService.addStageParam(stageParam));
	}

	@DeleteMapping(URL + "/{id}")
	public void deleteStageParam(@PathVariable String id, StageParamModelAssemblerSupport assembler) {
		stageParamService.deleteStageParam(id);
	}

	@GetMapping(URL + "/{id}")
	public StageParamModel getStageParam(@PathVariable String id, StageParamModelAssemblerSupport assembler) {
		return assembler.toModel(stageParamService.getStageParam(id));
	}

	@GetMapping(URL + "/search/findByStage")
	public StageParamModel getStageParamByStageAndTeam(@RequestParam Integer stage,
			StageParamModelAssemblerSupport assembler) {
		return assembler.toModel(stageParamService.getStageParamByStage(stage));
	}

	@GetMapping(URL)
	public CollectionModel<StageParamModel> getStageParams(StageParamModelAssemblerSupport assembler) {
		return assembler.toCollectionModel(stageParamService.getStageParams());
	}

	@PatchMapping(URL)
	public StageParamModel updateStageParam(@RequestBody StageParam stageParam,
			StageParamModelAssemblerSupport assembler) {
		return assembler.toModel(stageParamService.updateStageParam(stageParam));
	}

}
