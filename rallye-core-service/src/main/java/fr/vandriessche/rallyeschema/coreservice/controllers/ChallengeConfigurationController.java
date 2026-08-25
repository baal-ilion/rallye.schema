package fr.vandriessche.rallyeschema.coreservice.controllers;

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

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.models.ChallengeConfigurationModel;
import fr.vandriessche.rallyeschema.coreservice.models.ChallengeConfigurationModelAssemblerSupport;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeConfigurationService;

@RestController
public class ChallengeConfigurationController {
	public static final String URL = "/challengeConfigurations";

	@Autowired
	private ChallengeConfigurationService challengeConfigurationService;

	@PostMapping(URL)
	public ChallengeConfigurationModel addChallengeConfiguration(@RequestBody ChallengeConfiguration challengeConfiguration,
			ChallengeConfigurationModelAssemblerSupport assembler) {
		return assembler.toModel(challengeConfigurationService.addChallengeConfiguration(challengeConfiguration));
	}

	@DeleteMapping(URL + "/{id}")
	public void deleteChallengeConfiguration(@PathVariable String id, ChallengeConfigurationModelAssemblerSupport assembler) {
		challengeConfigurationService.deleteChallengeConfiguration(id);
	}

	@GetMapping(URL + "/{id}")
	public ChallengeConfigurationModel getChallengeConfiguration(@PathVariable String id, ChallengeConfigurationModelAssemblerSupport assembler) {
		return assembler.toModel(challengeConfigurationService.getChallengeConfiguration(id));
	}

	@GetMapping(URL + "/search/findByChallenge")
	public ChallengeConfigurationModel getChallengeConfigurationByChallengeAndTeam(@RequestParam Integer challenge,
			ChallengeConfigurationModelAssemblerSupport assembler) {
		return assembler.toModel(challengeConfigurationService.getChallengeConfigurationByChallenge(challenge));
	}

	@GetMapping(URL)
	public CollectionModel<ChallengeConfigurationModel> getChallengeConfigurations(ChallengeConfigurationModelAssemblerSupport assembler) {
		return assembler.toCollectionModel(challengeConfigurationService.getChallengeConfigurations());
	}

	@PatchMapping(URL)
	public ChallengeConfigurationModel updateChallengeConfiguration(@RequestBody ChallengeConfiguration challengeConfiguration,
			ChallengeConfigurationModelAssemblerSupport assembler) {
		return assembler.toModel(challengeConfigurationService.updateChallengeConfiguration(challengeConfiguration));
	}

}
