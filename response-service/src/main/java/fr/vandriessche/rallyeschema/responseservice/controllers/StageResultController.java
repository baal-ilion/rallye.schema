package fr.vandriessche.rallyeschema.responseservice.controllers;

import java.io.IOException;
import java.security.InvalidAlgorithmParameterException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import javax.xml.parsers.ParserConfigurationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Sort.Order;
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
	public CollectionModel<EntityModel<StageResult>> getStageResults(@RequestParam(required = false) Integer stage,
			@RequestParam(required = false) Integer team, @RequestParam(required = false) Boolean checked,
			@RequestParam(required = false) Boolean entered, @RequestParam(required = false) Boolean finished,
			@RequestParam(value = "sortBy", required = false) String[] sortBy, StageResultModelAssembler assembler) {
		List<Order> orders = new ArrayList<>();
		if (Objects.isNull(sortBy) || sortBy.length == 0) {
			orders.add(new Order(Sort.Direction.ASC, "stage"));
			orders.add(new Order(Sort.Direction.ASC, "team"));
		} else if (sortBy[0].contains(",")) {
			// will sort more than 2 columns
			for (String sortOrder : sortBy) {
				// sortOrder="column, direction"
				String[] sort = sortOrder.split(",");
				orders.add(new Order(getSortDirection(sort[1].toLowerCase().strip()), sort[0].strip()));
			}
		} else {
			// sort=[column, direction]
			orders.add(new Order(getSortDirection(sortBy[1].toLowerCase().strip()), sortBy[0].strip()));
		}
		Sort.by(orders);
		return assembler.toCollectionModel(
				stageResultService.getStageResults(stage, team, checked, entered, finished, Sort.by(orders)));
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

	private Sort.Direction getSortDirection(String direction) {
		if (direction.equals("asc")) {
			return Sort.Direction.ASC;
		} else if (direction.equals("desc")) {
			return Sort.Direction.DESC;
		}
		return Sort.Direction.ASC;
	}
}
