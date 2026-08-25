package fr.vandriessche.rallyeschema.coreservice.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.OptimisticLockingFailureException;

import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;
import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengePoint;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeRanking;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.coreservice.repositories.SubmittedFormMetadataRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormRecognitionConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeGroupRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeRankingRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResponseRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResultRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamPointRepository;

@ExtendWith(MockitoExtension.class)
class ChallengeConfigurationServiceTests {
	@InjectMocks
	private ChallengeConfigurationService challengeConfigurationService;

	@Mock
	private ChallengeConfigurationRepository challengeConfigurationRepository;
	@Mock
	private ChallengeGroupRepository challengeGroupRepository;
	@Mock
	private FormRecognitionConfigurationRepository formRecognitionConfigurationRepository;
	@Mock
	private SubmittedFormMetadataRepository submittedFormMetadataRepository;
	@Mock
	private ChallengeResponseRepository challengeResponseRepository;
	@Mock
	private ChallengeResultRepository challengeResultRepository;
	@Mock
	private ChallengeRankingRepository challengeRankingRepository;
	@Mock
	private TeamPointRepository teamPointRepository;

	@Test
	void updateChallengeConfigurationRejectsAnOutdatedVersion() {
		ChallengeConfiguration current = new ChallengeConfiguration(45);
		current.setId("challenge-configuration-id");
		current.setVersion(4L);

		ChallengeConfiguration outdated = new ChallengeConfiguration(45);
		outdated.setId(current.getId());
		outdated.setVersion(3L);

		when(challengeConfigurationRepository.findById(current.getId())).thenReturn(Optional.of(current));

		assertThrows(OptimisticLockingFailureException.class,
				() -> challengeConfigurationService.updateChallengeConfiguration(outdated));
	}

	@Test
	void updateChallengeConfigurationMigratesDependentChallengeNumbers() {
		ChallengeConfiguration existingChallengeConfiguration = new ChallengeConfiguration(45);
		existingChallengeConfiguration.setId("challenge-configuration-id");
		existingChallengeConfiguration.setName("Ancienne epreuve");

		FormRecognitionConfiguration linkedFormRecognitionConfiguration = new FormRecognitionConfiguration();
		linkedFormRecognitionConfiguration.setId("form-recognition-configuration-id");
		linkedFormRecognitionConfiguration.setChallenge(45);
		linkedFormRecognitionConfiguration.setPage(1);
		existingChallengeConfiguration.getFormRecognitionConfigurations().add(linkedFormRecognitionConfiguration);

		ChallengeConfiguration update = new ChallengeConfiguration();
		update.setId(existingChallengeConfiguration.getId());
		update.setChallenge(46);
		update.setName("Nouvelle epreuve");

		FormRecognitionConfiguration storedFormRecognitionConfiguration = new FormRecognitionConfiguration();
		storedFormRecognitionConfiguration.setId(linkedFormRecognitionConfiguration.getId());
		storedFormRecognitionConfiguration.setChallenge(45);
		storedFormRecognitionConfiguration.setPage(1);

		SubmittedFormMetadata submittedFormMetadata = new SubmittedFormMetadata();
		submittedFormMetadata.setChallenge(45);
		submittedFormMetadata.setTeam(7);
		submittedFormMetadata.setPage(1);

		ChallengeResponse challengeResponse = new ChallengeResponse();
		challengeResponse.setChallenge(45);
		challengeResponse.setTeam(7);

		ChallengeResult challengeResult = new ChallengeResult(45, 7);

		ChallengeRanking challengeRanking = new ChallengeRanking(45);

		TeamPoint teamPoint = new TeamPoint(7);
		teamPoint.getChallengePoints().put(45, new ChallengePoint(45, 12L));

		when(challengeConfigurationRepository.findById(existingChallengeConfiguration.getId())).thenReturn(Optional.of(existingChallengeConfiguration));
		when(challengeConfigurationRepository.findByChallenge(46)).thenReturn(Optional.empty());
		when(challengeConfigurationRepository.save(any(ChallengeConfiguration.class))).thenAnswer(invocation -> invocation.getArgument(0));

		when(formRecognitionConfigurationRepository.findByChallenge(46)).thenReturn(List.of());
		when(formRecognitionConfigurationRepository.findByChallenge(45)).thenReturn(List.of(storedFormRecognitionConfiguration));
		when(submittedFormMetadataRepository.findByChallenge(46)).thenReturn(List.of());
		when(submittedFormMetadataRepository.findByChallenge(45)).thenReturn(List.of(submittedFormMetadata));
		when(challengeResponseRepository.findByChallenge(46)).thenReturn(List.of());
		when(challengeResponseRepository.findByChallenge(45)).thenReturn(List.of(challengeResponse));
		when(challengeResultRepository.findByChallenge(46)).thenReturn(List.of());
		when(challengeResultRepository.findByChallenge(45)).thenReturn(List.of(challengeResult));
		when(challengeRankingRepository.findByChallenge(46)).thenReturn(Optional.empty());
		when(challengeRankingRepository.findByChallenge(45)).thenReturn(Optional.of(challengeRanking));
		List<TeamPoint> teamPoints = List.of(teamPoint);
		when(teamPointRepository.findAll()).thenReturn(teamPoints).thenReturn(teamPoints);

		ChallengeConfiguration result = challengeConfigurationService.updateChallengeConfiguration(update);

		assertEquals(46, result.getChallenge());
		assertEquals(46, linkedFormRecognitionConfiguration.getChallenge());
		assertEquals(46, storedFormRecognitionConfiguration.getChallenge());
		assertEquals(46, submittedFormMetadata.getChallenge());
		assertEquals(46, challengeResponse.getChallenge());
		assertEquals(46, challengeResult.getChallenge());
		assertEquals(46, challengeRanking.getChallenge());
		assertFalse(teamPoint.getChallengePoints().containsKey(45));
		assertTrue(teamPoint.getChallengePoints().containsKey(46));
		assertEquals(46, teamPoint.getChallengePoints().get(46).getChallenge());

		verify(formRecognitionConfigurationRepository).save(storedFormRecognitionConfiguration);
		verify(submittedFormMetadataRepository).save(submittedFormMetadata);
		verify(challengeResponseRepository).save(challengeResponse);
		verify(challengeResultRepository).save(challengeResult);
		verify(challengeRankingRepository).save(challengeRanking);
		verify(teamPointRepository).save(teamPoint);
	}
}
