package fr.vandriessche.rallyeschema.coreservice.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import fr.vandriessche.rallyeschema.coreservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormDesignRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;

@ExtendWith(MockitoExtension.class)
class FormDesignServiceTests {
	@InjectMocks
	private FormDesignService formDesignService;
	@Mock
	private FormDesignRepository formDesignRepository;
	@Mock
	private ChallengeConfigurationRepository challengeConfigurationRepository;

	@Test
	void saveChallengeDesignLinksItToAnExistingChallenge() {
		ChallengeConfiguration challenge = new ChallengeConfiguration(45);
		challenge.setId("challenge-id");
		FormDesign design = new FormDesign();
		design.setSchemaVersion(6);
		when(challengeConfigurationRepository.findById("challenge-id")).thenReturn(Optional.of(challenge));
		when(formDesignRepository.findByChallengeConfigurationId("challenge-id")).thenReturn(Optional.empty());
		when(formDesignRepository.save(any(FormDesign.class))).thenAnswer(invocation -> invocation.getArgument(0));

		FormDesign result = formDesignService.saveChallengeFormDesign("challenge-id", design);

		assertSame(design, result);
		assertEquals("challenge-id", result.getId());
		assertEquals("challenge-id", result.getChallengeConfigurationId());
		assertEquals(6, result.getSchemaVersion());
	}

	@Test
	void referenceDesignIsNeverLinkedToAChallenge() {
		FormDesign design = new FormDesign();
		design.setChallengeConfigurationId("old-challenge");
		when(formDesignRepository.findById(FormDesign.REFERENCE_ID)).thenReturn(Optional.empty());
		when(formDesignRepository.save(any(FormDesign.class))).thenAnswer(invocation -> invocation.getArgument(0));

		FormDesign result = formDesignService.saveReferenceFormDesign(design);

		assertEquals(FormDesign.REFERENCE_ID, result.getId());
		assertNull(result.getChallengeConfigurationId());
	}

	@Test
	void deleteChallengeDesignDoesNotDeleteTheChallenge() {
		formDesignService.deleteChallengeFormDesign("challenge-id");

		verify(formDesignRepository).deleteByChallengeConfigurationId("challenge-id");
	}
}
