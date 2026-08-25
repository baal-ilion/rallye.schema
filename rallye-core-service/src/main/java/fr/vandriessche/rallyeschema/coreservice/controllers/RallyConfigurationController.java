package fr.vandriessche.rallyeschema.coreservice.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.coreservice.entities.RallyConfiguration;
import fr.vandriessche.rallyeschema.coreservice.services.RallyConfigurationService;

@RestController
@RequestMapping({ RallyConfigurationController.URL, RallyConfigurationController.API_URL })
public class RallyConfigurationController {
	public static final String URL = "/rally";
	public static final String API_URL = "/api/rally";

	@Autowired
	private RallyConfigurationService rallyConfigurationService;

	@GetMapping
	public RallyConfiguration getRallyConfiguration() {
		return rallyConfigurationService.getRallyConfiguration();
	}

	@PutMapping
	public RallyConfiguration saveRallyConfiguration(@RequestBody RallyConfiguration rallyConfiguration) {
		return rallyConfigurationService.saveRallyConfiguration(rallyConfiguration);
	}
}
