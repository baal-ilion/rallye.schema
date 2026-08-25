package fr.vandriessche.rallyeschema.coreservice.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import fr.vandriessche.rallyeschema.coreservice.entities.LogFile;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeRanking;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import fr.vandriessche.rallyeschema.coreservice.entities.Team;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamRank;
import fr.vandriessche.rallyeschema.coreservice.repositories.LogFileRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.SubmittedFormMetadataRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeRankingRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResponseRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResultRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamPointRepository;

@ExtendWith(MockitoExtension.class)
class TeamServiceTests {
    @InjectMocks
    private TeamService teamService;

    @Mock
    private TeamRepository teamRepository;
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
    @Mock
    private LogFileRepository logFileRepository;
    @Mock
    private MessageProducerService messageProducerService;
    @Mock
    private TeamUpdatePublisher teamUpdatePublisher;
    @Mock
    private SubmittedFormService submittedFormService;
    @Mock
    private ChallengeResponseService challengeResponseService;
    @Mock
    private ChallengeResultService challengeResultService;
    @Mock
    private TeamPointService teamPointService;

    @Test
    void updateTeamMigratesDependentTeamNumbers() {
        Team existingTeam = new Team();
        existingTeam.setId("team-id");
        existingTeam.setTeam(12);
        existingTeam.setName("Ancienne equipe");

        Team update = new Team();
        update.setId(existingTeam.getId());
        update.setTeam(34);
        update.setName("Nouvelle equipe");

        SubmittedFormMetadata submittedFormMetadata = new SubmittedFormMetadata();
        submittedFormMetadata.setTeam(12);
        submittedFormMetadata.setChallenge(45);
        submittedFormMetadata.setPage(1);

        ChallengeResponse challengeResponse = new ChallengeResponse();
        challengeResponse.setTeam(12);
        challengeResponse.setChallenge(45);

        ChallengeResult challengeResult = new ChallengeResult(45, 12);

        TeamPoint teamPoint = new TeamPoint(12);

        ChallengeRanking challengeRanking = new ChallengeRanking(45);
        TeamRank<Instant> beginRank = new TeamRank<>(12, Instant.parse("2026-04-28T20:00:00Z"));
        TeamRank<Instant> endRank = new TeamRank<>(12, Instant.parse("2026-04-28T21:00:00Z"));
        TeamRank<Double> performanceRank = new TeamRank<>(12, 18.5D);
        challengeRanking.getBegins().add(beginRank);
        challengeRanking.getEnds().add(endRank);
        challengeRanking.getPerformances().put("temps", List.of(performanceRank));

        LogFile logFile = new LogFile();
        logFile.setTeam(12);
        logFile.setSource("source");

        when(teamRepository.findById(existingTeam.getId())).thenReturn(Optional.of(existingTeam));
        when(teamRepository.findByTeam(34)).thenReturn(Optional.empty());
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(submittedFormMetadataRepository.findByTeam(34)).thenReturn(List.of());
        when(submittedFormMetadataRepository.findByTeam(12)).thenReturn(List.of(submittedFormMetadata));
        when(challengeResponseRepository.findByTeam(34)).thenReturn(List.of());
        when(challengeResponseRepository.findByTeam(12)).thenReturn(List.of(challengeResponse));
        when(challengeResultRepository.findByTeam(34)).thenReturn(List.of());
        when(challengeResultRepository.findByTeam(12)).thenReturn(List.of(challengeResult));
        when(teamPointRepository.findByTeam(34)).thenReturn(Optional.empty());
        when(teamPointRepository.findByTeam(12)).thenReturn(Optional.of(teamPoint));
        when(logFileRepository.findByTeam(34)).thenReturn(List.of());
        when(logFileRepository.findByTeam(12)).thenReturn(List.of(logFile));
        List<ChallengeRanking> challengeRankings = List.of(challengeRanking);
        when(challengeRankingRepository.findAll()).thenReturn(challengeRankings).thenReturn(challengeRankings);

        Team result = teamService.updateTeam(update);

        assertEquals(34, result.getTeam());
        assertEquals(34, submittedFormMetadata.getTeam());
        assertEquals(34, challengeResponse.getTeam());
        assertEquals(34, challengeResult.getTeam());
        assertEquals(34, teamPoint.getTeam());
        assertEquals(34, beginRank.getTeam());
        assertEquals(34, endRank.getTeam());
        assertEquals(34, performanceRank.getTeam());
        assertEquals(34, logFile.getTeam());

        verify(submittedFormMetadataRepository).save(submittedFormMetadata);
        verify(challengeResponseRepository).save(challengeResponse);
        verify(challengeResultRepository).save(challengeResult);
        verify(teamPointRepository).save(teamPoint);
        verify(challengeRankingRepository).save(challengeRanking);
        verify(logFileRepository).save(logFile);
    }
}
