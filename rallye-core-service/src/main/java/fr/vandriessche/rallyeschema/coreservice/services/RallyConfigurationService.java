package fr.vandriessche.rallyeschema.coreservice.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.coreservice.entities.RallyConfiguration;
import fr.vandriessche.rallyeschema.coreservice.repositories.RallyConfigurationRepository;

@Service
public class RallyConfigurationService {
	@Autowired
	private RallyConfigurationRepository rallyConfigurationRepository;

	public RallyConfiguration getRallyConfiguration() {
		return rallyConfigurationRepository.findById(RallyConfiguration.SINGLETON_ID)
				.orElseGet(() -> rallyConfigurationRepository.save(new RallyConfiguration()));
	}

	public RallyConfiguration saveRallyConfiguration(RallyConfiguration rallyConfiguration) {
		rallyConfiguration.setId(RallyConfiguration.SINGLETON_ID);
		return rallyConfigurationRepository.save(rallyConfiguration);
	}
}
