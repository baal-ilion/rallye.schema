package fr.vandriessche.rallyeschema.formscannerservice.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.formscannerservice.entities.StageParam;
import fr.vandriessche.rallyeschema.formscannerservice.services.StageParamService;

@RestController
public class StageParamController {
	@Autowired
	private StageParamService stageParamService;

	@GetMapping("/stageParam/{id}")
	public ResponseEntity<StageParam> getStageParam(@PathVariable String id) {
		return ResponseEntity.ok(stageParamService.getStageParam(id));
	}

	@GetMapping("/stageParams")
	public List<StageParam> getStageParams() {
		return stageParamService.getStageParams();
	}

	@GetMapping("/stageParam/search/findByStage")
	public StageParam getStageParamByStageAndTeam(@RequestParam Integer stage) {
		return stageParamService.getStageParamByStage(stage);
	}

	@PatchMapping("/stageParam")
	public ResponseEntity<StageParam> updateStageParam(@RequestBody StageParam stageParam) {
		return ResponseEntity.ok(stageParamService.updateStageParam(stageParam));
	}
}
