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

import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResult;
import fr.vandriessche.rallyeschema.formscannerservice.services.StageResultService;

@RestController
public class StageResultController {
	@Autowired
	private StageResultService stageResultService;

	@GetMapping("/stageResult/{id}")
	public ResponseEntity<StageResult> getStageResult(@PathVariable String id) {
		return ResponseEntity.ok(stageResultService.getStageResult(id));
	}

	@GetMapping("/stageResults")
	public List<StageResult> getStageResults() {
		return stageResultService.getStageResults();
	}

	@GetMapping("/stageResult/search/findByStageAndTeam")
	public StageResult getStageResultByStageAndTeam(@RequestParam Integer stage, @RequestParam Integer team) {
		return stageResultService.getStageResultByStageAndTeam(stage, team);
	}

	@PatchMapping("/stageResult")
	public ResponseEntity<StageResult> updateStageResult(@RequestBody StageResult stageResult) {
		return ResponseEntity.ok(stageResultService.updateStageResult(stageResult));
	}
}
