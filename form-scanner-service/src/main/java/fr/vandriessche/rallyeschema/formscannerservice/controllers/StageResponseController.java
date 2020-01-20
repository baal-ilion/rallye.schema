package fr.vandriessche.rallyeschema.formscannerservice.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResponse;
import fr.vandriessche.rallyeschema.formscannerservice.models.StageResponseModelAssembler;
import fr.vandriessche.rallyeschema.formscannerservice.services.StageResponseService;

@RestController
public class StageResponseController {
	public static final String URL = "/stageResponses";

	@Autowired
	private StageResponseService stageResponseService;

	@PostMapping(URL)
	public EntityModel<StageResponse> addOrReplaceStageResponse(@RequestBody StageResponse stageResponse,
			StageResponseModelAssembler assembler) {
		return assembler.toModel(stageResponseService.addOrReplaceStageResponse(stageResponse));
	}

	@DeleteMapping(URL + "/{id}")
	public void deleteStageResponse(@PathVariable String id) {
		stageResponseService.deleteStageResponse(id);
	}

	@GetMapping(URL + "/{id}")
	public EntityModel<StageResponse> getStageResponse(@PathVariable String id, StageResponseModelAssembler assembler) {
		return assembler.toModel(stageResponseService.getStageResponse(id));
	}

	@GetMapping(URL + "/search/findByStageAndTeam")
	public EntityModel<StageResponse> getStageResponseByStageAndTeam(@RequestParam Integer stage,
			@RequestParam Integer team, StageResponseModelAssembler assembler) {
		return assembler.toModel(stageResponseService.getStageResponseByStageAndTeam(stage, team));
	}

	@GetMapping(URL)
	public CollectionModel<EntityModel<StageResponse>> getStageResponses(StageResponseModelAssembler assembler) {
		return assembler.toCollectionModel(stageResponseService.getStageResponses());
	}
}
