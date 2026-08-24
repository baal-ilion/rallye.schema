package fr.vandriessche.rallyeschema.coreservice.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import fr.vandriessche.rallyeschema.coreservice.entities.RallyConfiguration;
import fr.vandriessche.rallyeschema.coreservice.repositories.RallyConfigurationRepository;

@ExtendWith(MockitoExtension.class)
class RallyConfigurationServiceTests {
	@InjectMocks
	private RallyConfigurationService rallyConfigurationService;
	@Mock
	private RallyConfigurationRepository rallyConfigurationRepository;

	@Test
	void getCreatesTheSingletonForAnEmptyDatabase() {
		when(rallyConfigurationRepository.findById(RallyConfiguration.SINGLETON_ID)).thenReturn(Optional.empty());
		when(rallyConfigurationRepository.save(any(RallyConfiguration.class))).thenAnswer(invocation -> invocation.getArgument(0));

		RallyConfiguration result = rallyConfigurationService.getRallyConfiguration();

		assertEquals(RallyConfiguration.SINGLETON_ID, result.getId());
		assertEquals(0.53D, result.getCorrectionCellWidthCm());
		verify(rallyConfigurationRepository).save(any(RallyConfiguration.class));
	}

	@Test
	void saveAlwaysUsesTheSingletonIdentifier() {
		RallyConfiguration input = new RallyConfiguration();
		input.setId("another-id");
		when(rallyConfigurationRepository.save(any(RallyConfiguration.class))).thenAnswer(invocation -> invocation.getArgument(0));

		RallyConfiguration result = rallyConfigurationService.saveRallyConfiguration(input);

		assertEquals(RallyConfiguration.SINGLETON_ID, result.getId());
	}
}
