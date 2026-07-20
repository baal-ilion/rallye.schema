package fr.vandriessche.rallyeschema.responseservice.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.responseservice.entities.RallyParam;
import fr.vandriessche.rallyeschema.responseservice.services.RallyParamService;

@RestController
@RequestMapping({ RallyParamController.URL, RallyParamController.API_URL })
public class RallyParamController {
	public static final String URL = "/rally";
	public static final String API_URL = "/api/rally";

	@Autowired
	private RallyParamService rallyParamService;

	@GetMapping
	public RallyParam getRallyParam() {
		return rallyParamService.getRallyParam();
	}

	@PutMapping
	public RallyParam saveRallyParam(@RequestBody RallyParam rallyParam) {
		return rallyParamService.saveRallyParam(rallyParam);
	}
}
