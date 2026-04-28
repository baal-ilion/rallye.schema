package fr.vandriessche.rallyeschema.responseservice.services;

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

import fr.vandriessche.rallyeschema.responseservice.entities.LogFile;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.StageRanking;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResponse;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamRank;
import fr.vandriessche.rallyeschema.responseservice.repositories.LogFileRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileInfoRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageRankingRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageResponseRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageResultRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamInfoRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamPointRepository;

@ExtendWith(MockitoExtension.class)
class TeamInfoServiceTests {
    @InjectMocks
    private TeamInfoService teamInfoService;

    @Mock
    private TeamInfoRepository teamInfoRepository;
    @Mock
    private ResponseFileInfoRepository responseFileInfoRepository;
    @Mock
    private StageResponseRepository stageResponseRepository;
    @Mock
    private StageResultRepository stageResultRepository;
    @Mock
    private StageRankingRepository stageRankingRepository;
    @Mock
    private TeamPointRepository teamPointRepository;
    @Mock
    private LogFileRepository logFileRepository;
    @Mock
    private MessageProducerService messageProducerService;
    @Mock
    private TeamInfoUpdatePublisher teamInfoUpdatePublisher;
    @Mock
    private ResponseFileService responseFileService;
    @Mock
    private StageResponseService stageResponseService;
    @Mock
    private StageResultService stageResultService;
    @Mock
    private TeamPointService teamPointService;

    @Test
    void updateTeamInfoMigratesDependentTeamNumbers() {
        TeamInfo existingTeamInfo = new TeamInfo();
        existingTeamInfo.setId("team-info-id");
        existingTeamInfo.setTeam(12);
        existingTeamInfo.setName("Ancienne equipe");

        TeamInfo update = new TeamInfo();
        update.setId(existingTeamInfo.getId());
        update.setTeam(34);
        update.setName("Nouvelle equipe");

        ResponseFileInfo responseFileInfo = new ResponseFileInfo();
        responseFileInfo.setTeam(12);
        responseFileInfo.setStage(45);
        responseFileInfo.setPage(1);

        StageResponse stageResponse = new StageResponse();
        stageResponse.setTeam(12);
        stageResponse.setStage(45);

        StageResult stageResult = new StageResult(45, 12);

        TeamPoint teamPoint = new TeamPoint(12);

        StageRanking stageRanking = new StageRanking(45);
        TeamRank<Instant> beginRank = new TeamRank<>(12, Instant.parse("2026-04-28T20:00:00Z"));
        TeamRank<Instant> endRank = new TeamRank<>(12, Instant.parse("2026-04-28T21:00:00Z"));
        TeamRank<Double> performanceRank = new TeamRank<>(12, 18.5D);
        stageRanking.getBegins().add(beginRank);
        stageRanking.getEnds().add(endRank);
        stageRanking.getPerformances().put("temps", List.of(performanceRank));

        LogFile logFile = new LogFile();
        logFile.setTeam(12);
        logFile.setSource("source");

        when(teamInfoRepository.findById(existingTeamInfo.getId())).thenReturn(Optional.of(existingTeamInfo));
        when(teamInfoRepository.findByTeam(34)).thenReturn(Optional.empty());
        when(teamInfoRepository.save(any(TeamInfo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(responseFileInfoRepository.findByTeam(34)).thenReturn(List.of());
        when(responseFileInfoRepository.findByTeam(12)).thenReturn(List.of(responseFileInfo));
        when(stageResponseRepository.findByTeam(34)).thenReturn(List.of());
        when(stageResponseRepository.findByTeam(12)).thenReturn(List.of(stageResponse));
        when(stageResultRepository.findByTeam(34)).thenReturn(List.of());
        when(stageResultRepository.findByTeam(12)).thenReturn(List.of(stageResult));
        when(teamPointRepository.findByTeam(34)).thenReturn(Optional.empty());
        when(teamPointRepository.findByTeam(12)).thenReturn(Optional.of(teamPoint));
        when(logFileRepository.findByTeam(34)).thenReturn(List.of());
        when(logFileRepository.findByTeam(12)).thenReturn(List.of(logFile));
        List<StageRanking> stageRankings = List.of(stageRanking);
        when(stageRankingRepository.findAll()).thenReturn(stageRankings).thenReturn(stageRankings);

        TeamInfo result = teamInfoService.updateTeamInfo(update);

        assertEquals(34, result.getTeam());
        assertEquals(34, responseFileInfo.getTeam());
        assertEquals(34, stageResponse.getTeam());
        assertEquals(34, stageResult.getTeam());
        assertEquals(34, teamPoint.getTeam());
        assertEquals(34, beginRank.getTeam());
        assertEquals(34, endRank.getTeam());
        assertEquals(34, performanceRank.getTeam());
        assertEquals(34, logFile.getTeam());

        verify(responseFileInfoRepository).save(responseFileInfo);
        verify(stageResponseRepository).save(stageResponse);
        verify(stageResultRepository).save(stageResult);
        verify(teamPointRepository).save(teamPoint);
        verify(stageRankingRepository).save(stageRanking);
        verify(logFileRepository).save(logFile);
    }
}
