package fr.vandriessche.rallyeschema.coreservice.controllers;

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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.xml.sax.SAXException;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import fr.vandriessche.rallyeschema.coreservice.models.ChallengeResultModelAssembler;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeResultService;

@RestController
public class ChallengeResultController {
	public static final String URL = "/challengeResults";

	@Autowired
	private ChallengeResultService challengeResultService;

	@PostMapping(URL + "/begin")
	public EntityModel<ChallengeResult> beginChallengeResult(@RequestParam Integer challenge, @RequestParam Integer team,
			ChallengeResultModelAssembler assembler) {
		return assembler.toModel(challengeResultService.beginChallengeResult(challenge, team));
	}

	@DeleteMapping(URL + "/begin")
	public EntityModel<ChallengeResult> cancelChallengeResult(@RequestParam Integer challenge, @RequestParam Integer team,
			ChallengeResultModelAssembler assembler) {
		return assembler.toModel(challengeResultService.cancelChallengeResult(challenge, team));
	}

	@PostMapping(URL + "/end")
	public EntityModel<ChallengeResult> endChallengeResult(@RequestParam Integer challenge, @RequestParam Integer team,
			ChallengeResultModelAssembler assembler) {
		return assembler.toModel(challengeResultService.endChallengeResult(challenge, team));
	}

	@GetMapping(URL + "/{id}")
	public EntityModel<ChallengeResult> getChallengeResult(@PathVariable String id, ChallengeResultModelAssembler assembler) {
		return assembler.toModel(challengeResultService.getChallengeResult(id));
	}

	@GetMapping(URL + "/search/findByChallengeAndTeam")
	public EntityModel<ChallengeResult> getChallengeResultByChallengeAndTeam(@RequestParam Integer challenge,
			@RequestParam Integer team, ChallengeResultModelAssembler assembler) {
		var challengeResult = challengeResultService.getChallengeResultByChallengeAndTeam(challenge, team);
		if (Objects.isNull(challengeResult)) {
			throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "ChallengeResult not found");
		}
		return assembler.toModel(challengeResult);
	}

	@GetMapping(URL)
	public CollectionModel<EntityModel<ChallengeResult>> getChallengeResults(@RequestParam(required = false) Integer challenge,
			@RequestParam(required = false) Integer team, @RequestParam(required = false) Boolean checked,
			@RequestParam(required = false) Boolean entered, @RequestParam(required = false) Boolean finished,
			@RequestParam(value = "sortBy", required = false) String[] sortBy, ChallengeResultModelAssembler assembler) {
		List<Order> orders = new ArrayList<>();
		if (Objects.isNull(sortBy) || sortBy.length == 0) {
			orders.add(new Order(Sort.Direction.ASC, "challenge"));
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
				challengeResultService.getChallengeResults(challenge, team, checked, entered, finished, Sort.by(orders)));
	}

	@GetMapping(URL + "/search/findByTeam")
	public CollectionModel<EntityModel<ChallengeResult>> getChallengeResultsByTeam(@RequestParam Integer team,
			ChallengeResultModelAssembler assembler) {
		return assembler.toCollectionModel(challengeResultService.getChallengeResultsByTeam(team));
	}

	@PostMapping(URL + "/submittedForm")
	public ResponseEntity<?> selectSubmittedForm(@RequestParam Integer challenge, @RequestParam Integer team,
			@RequestParam(value = "submittedFormId") String[] submittedFormIds, @RequestParam Boolean delete,
			ChallengeResultModelAssembler assembler) throws InvalidAlgorithmParameterException,
			ParserConfigurationException, SAXException, IOException {
		try {
			return ResponseEntity.ok(
					assembler.toModel(challengeResultService.selectSubmittedForm(challenge, team, submittedFormIds, delete)));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(java.util.Map.of("message", exception.getMessage()));
		}
	}

	@PostMapping(URL + "/submittedForm/release")
	public ResponseEntity<?> releaseSubmittedForm(@RequestParam Integer challenge, @RequestParam Integer team,
			@RequestParam String submittedFormId, ChallengeResultModelAssembler assembler)
			throws ParserConfigurationException, SAXException, IOException {
		try {
			return ResponseEntity.ok(assembler.toModel(
					challengeResultService.releaseSubmittedForm(challenge, team, submittedFormId)));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(java.util.Map.of("message", exception.getMessage()));
		}
	}

	@DeleteMapping(URL + "/submittedForm")
	public ResponseEntity<?> deleteSelectedSubmittedForm(@RequestParam Integer challenge, @RequestParam Integer team,
			@RequestParam String submittedFormId, ChallengeResultModelAssembler assembler) {
		try {
			return ResponseEntity.ok(assembler.toModel(
					challengeResultService.deleteSelectedSubmittedForm(challenge, team, submittedFormId)));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(java.util.Map.of("message", exception.getMessage()));
		}
	}

	@DeleteMapping(URL + "/end")
	public EntityModel<ChallengeResult> undoChallengeResult(@RequestParam Integer challenge, @RequestParam Integer team,
			ChallengeResultModelAssembler assembler) {
		return assembler.toModel(challengeResultService.undoChallengeResult(challenge, team));
	}

	@PatchMapping(URL)
	public EntityModel<ChallengeResult> updateChallengeResult(@RequestBody ChallengeResult challengeResult,
			ChallengeResultModelAssembler assembler) {
		return assembler.toModel(challengeResultService.updateChallengeResult(challengeResult));
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
