package fr.vandriessche.rallyeschema.coreservice.controllers;

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

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;
import fr.vandriessche.rallyeschema.coreservice.models.ChallengeResponseModelAssembler;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeResponseService;

@RestController
public class ChallengeResponseController {
	public static final String URL = "/challengeResponses";

	@Autowired
	private ChallengeResponseService challengeResponseService;

	@PostMapping(URL)
	public EntityModel<ChallengeResponse> addOrReplaceChallengeResponse(@RequestBody ChallengeResponse challengeResponse,
			ChallengeResponseModelAssembler assembler) {
		return assembler.toModel(challengeResponseService.addOrReplaceChallengeResponse(challengeResponse));
	}

	@DeleteMapping(URL + "/{id}")
	public void deleteChallengeResponse(@PathVariable String id) {
		challengeResponseService.deleteChallengeResponse(id);
	}

	@GetMapping(URL + "/{id}")
	public EntityModel<ChallengeResponse> getChallengeResponse(@PathVariable String id, ChallengeResponseModelAssembler assembler) {
		return assembler.toModel(challengeResponseService.getChallengeResponse(id));
	}

	@GetMapping(URL + "/search/findByChallengeAndTeam")
	public EntityModel<ChallengeResponse> getChallengeResponseByChallengeAndTeam(@RequestParam Integer challenge,
			@RequestParam Integer team, ChallengeResponseModelAssembler assembler) {
		return assembler.toModel(challengeResponseService.getChallengeResponseByChallengeAndTeam(challenge, team));
	}

	@GetMapping(URL)
	public CollectionModel<EntityModel<ChallengeResponse>> getChallengeResponses(ChallengeResponseModelAssembler assembler) {
		return assembler.toCollectionModel(challengeResponseService.getChallengeResponses());
	}
}
