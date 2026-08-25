package fr.vandriessche.rallyeschema.coreservice.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.coreservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.coreservice.services.FormDesignService;

@RestController
@RequestMapping({ FormDesignController.URL, FormDesignController.API_URL })
public class FormDesignController {
	public static final String URL = "/formDesigns";
	public static final String API_URL = "/api/formDesigns";

	@Autowired
	private FormDesignService formDesignService;

	@GetMapping("/challenges")
	public List<FormDesign> getChallengeFormDesigns() {
		return formDesignService.getChallengeFormDesigns();
	}

	@GetMapping("/challenges/{challengeConfigurationId}")
	public FormDesign getChallengeFormDesign(@PathVariable String challengeConfigurationId) {
		return formDesignService.getChallengeFormDesign(challengeConfigurationId);
	}

	@PutMapping("/challenges/{challengeConfigurationId}")
	public FormDesign saveChallengeFormDesign(@PathVariable String challengeConfigurationId, @RequestBody FormDesign design) {
		return formDesignService.saveChallengeFormDesign(challengeConfigurationId, design);
	}

	@DeleteMapping("/challenges/{challengeConfigurationId}")
	public void deleteChallengeFormDesign(@PathVariable String challengeConfigurationId) {
		formDesignService.deleteChallengeFormDesign(challengeConfigurationId);
	}

	@GetMapping("/reference")
	public FormDesign getReferenceFormDesign() {
		return formDesignService.getReferenceFormDesign();
	}

	@PutMapping("/reference")
	public FormDesign saveReferenceFormDesign(@RequestBody FormDesign design) {
		return formDesignService.saveReferenceFormDesign(design);
	}

	@DeleteMapping("/reference")
	public void deleteReferenceFormDesign() {
		formDesignService.deleteReferenceFormDesign();
	}
}
