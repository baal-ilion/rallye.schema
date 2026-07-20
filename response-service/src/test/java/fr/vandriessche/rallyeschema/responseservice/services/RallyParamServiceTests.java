package fr.vandriessche.rallyeschema.responseservice.services;

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

import fr.vandriessche.rallyeschema.responseservice.entities.RallyParam;
import fr.vandriessche.rallyeschema.responseservice.repositories.RallyParamRepository;

@ExtendWith(MockitoExtension.class)
class RallyParamServiceTests {
	@InjectMocks
	private RallyParamService rallyParamService;
	@Mock
	private RallyParamRepository rallyParamRepository;

	@Test
	void getCreatesTheSingletonForAnEmptyDatabase() {
		when(rallyParamRepository.findById(RallyParam.SINGLETON_ID)).thenReturn(Optional.empty());
		when(rallyParamRepository.save(any(RallyParam.class))).thenAnswer(invocation -> invocation.getArgument(0));

		RallyParam result = rallyParamService.getRallyParam();

		assertEquals(RallyParam.SINGLETON_ID, result.getId());
		assertEquals(0.53D, result.getCorrectionCellWidthCm());
		verify(rallyParamRepository).save(any(RallyParam.class));
	}

	@Test
	void saveAlwaysUsesTheSingletonIdentifier() {
		RallyParam input = new RallyParam();
		input.setId("another-id");
		when(rallyParamRepository.save(any(RallyParam.class))).thenAnswer(invocation -> invocation.getArgument(0));

		RallyParam result = rallyParamService.saveRallyParam(input);

		assertEquals(RallyParam.SINGLETON_ID, result.getId());
	}
}
