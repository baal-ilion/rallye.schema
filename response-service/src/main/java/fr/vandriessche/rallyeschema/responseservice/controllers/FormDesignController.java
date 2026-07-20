package fr.vandriessche.rallyeschema.responseservice.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.responseservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.responseservice.services.FormDesignService;

@RestController
@RequestMapping({ FormDesignController.URL, FormDesignController.API_URL })
public class FormDesignController {
	public static final String URL = "/formDesigns";
	public static final String API_URL = "/api/formDesigns";

	@Autowired
	private FormDesignService formDesignService;

	@GetMapping("/stages")
	public List<FormDesign> getStageFormDesigns() {
		return formDesignService.getStageFormDesigns();
	}

	@GetMapping("/stages/{stageParamId}")
	public FormDesign getStageFormDesign(@PathVariable String stageParamId) {
		return formDesignService.getStageFormDesign(stageParamId);
	}

	@PutMapping("/stages/{stageParamId}")
	public FormDesign saveStageFormDesign(@PathVariable String stageParamId, @RequestBody FormDesign design) {
		return formDesignService.saveStageFormDesign(stageParamId, design);
	}

	@DeleteMapping("/stages/{stageParamId}")
	public void deleteStageFormDesign(@PathVariable String stageParamId) {
		formDesignService.deleteStageFormDesign(stageParamId);
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
