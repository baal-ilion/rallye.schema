package fr.vandriessche.rallyeschema.responseservice.services;

import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.responseservice.entities.LogFile;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.StageRanking;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResponse;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamRank;
import fr.vandriessche.rallyeschema.responseservice.repositories.LogFileRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileInfoRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageRankingRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageResponseRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageResultRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamInfoRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamPointRepository;

@Service
public class TeamInfoService {

    public static final String TEAM_INFO_CREATE_EVENT = "teamInfo.create";
    public static final String TEAM_INFO_UPDATE_EVENT = "teamInfo.update";
    public static final String TEAM_INFO_DELETE_EVENT = "teamInfo.delete";

    @Autowired
    private TeamInfoRepository teamInfoRepository;

    @Autowired
    private ResponseFileInfoRepository responseFileInfoRepository;

    @Autowired
    private StageResponseRepository stageResponseRepository;

    @Autowired
    private StageResultRepository stageResultRepository;

    @Autowired
    private StageRankingRepository stageRankingRepository;

    @Autowired
    private TeamPointRepository teamPointRepository;

    @Autowired
    private LogFileRepository logFileRepository;

    @Autowired
    private MessageProducerService messageProducerService;

    @Autowired
    private TeamInfoUpdatePublisher teamInfoUpdatePublisher;

    @Autowired
    private ResponseFileService responseFileService;

    @Autowired
    private StageResponseService stageResponseService;

    @Autowired
    private StageResultService stageResultService;

    @Autowired
    private TeamPointService teamPointService;

    public TeamInfo addTeamInfo(TeamInfo teamInfo) {
        teamInfo.setPresent(false);
        teamInfo = teamInfoRepository.save(teamInfo);
        messageProducerService.sendMessage(TEAM_INFO_CREATE_EVENT, teamInfo);
        teamInfoUpdatePublisher.publishTeamInfoUpdate();
        return teamInfo;
    }

    public long countTeamInfo() {
        return teamInfoRepository.count();
    }

    public void deleteTeamInfo(String id) {
        var teamInfo = teamInfoRepository.findById(id).orElseThrow();

        Integer teamNumber = teamInfo.getTeam();
        if (teamNumber != null) {
            try {
                responseFileService.deleteByTeam(teamNumber);
            } catch (Exception ignored) {
            }
            try {
                stageResponseService.deleteByTeam(teamNumber);
            } catch (Exception ignored) {
            }
            try {
                stageResultService.deleteByTeam(teamNumber);
            } catch (Exception ignored) {
            }
            try {
                teamPointService.deleteByTeam(teamNumber);
            } catch (Exception ignored) {
            }
        }

        teamInfoRepository.deleteById(id);
        messageProducerService.sendMessage(TEAM_INFO_DELETE_EVENT, teamInfo);
        teamInfoUpdatePublisher.publishTeamInfoUpdate();
    }

    public TeamInfo getTeamInfo(String id) {
        return teamInfoRepository.findById(id).orElseThrow();
    }

    public TeamInfo getTeamInfoByName(String name) {
        return teamInfoRepository.findByName(name).orElse(null);
    }

    public TeamInfo getTeamInfoByTeam(Integer team) {
        return teamInfoRepository.findByTeam(team).orElse(null);
    }

    public List<TeamInfo> getTeamInfos() {
        return teamInfoRepository.findAll();
    }

    public List<TeamInfo> getPresentTeamInfos() {
        return teamInfoRepository.findByPresentTrue();
    }

    public List<TeamInfo> getAbsentTeamInfos() {
        return teamInfoRepository.findByPresentFalse();
    }

    public TeamInfo setTeamPresence(String id, boolean present) {
        TeamInfo teamInfo = teamInfoRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Team not found"));
        if (teamInfo.isPresent() == present) {
            return teamInfo;
        }
        teamInfo.setPresent(present);
        teamInfo = teamInfoRepository.save(teamInfo);
        messageProducerService.sendMessage(TEAM_INFO_UPDATE_EVENT, teamInfo);
        teamInfoUpdatePublisher.publishTeamInfoUpdate();
        return teamInfo;
    }

    public TeamInfo markTeamPresent(String id) {
        return setTeamPresence(id, true);
    }

    public TeamInfo markTeamAbsent(String id) {
        return setTeamPresence(id, false);
    }

    public TeamInfo setTeamPresenceByTeam(Integer team, boolean present) {
        var teamInfo = teamInfoRepository.findByTeam(team)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Team not found"));
        return setTeamPresence(teamInfo.getId(), present);
    }

    public TeamInfo updateTeamInfo(TeamInfo teamInfo) {
        TeamInfo existing = teamInfo.getId() != null
                ? teamInfoRepository.findById(teamInfo.getId())
                        .orElseGet(() -> teamInfoRepository.findByTeam(teamInfo.getTeam()).orElseThrow())
                : teamInfoRepository.findByTeam(teamInfo.getTeam()).orElseThrow();
        boolean changed = false;
        Integer previousTeam = existing.getTeam();
        Integer nextTeam = teamInfo.getTeam();
        Integer migratedTeam = null;
        boolean teamChanged = nextTeam != null && !nextTeam.equals(previousTeam);

        if (teamInfo.getName() != null && !teamInfo.getName().equals(existing.getName())) {
            existing.setName(teamInfo.getName());
            changed = true;
        }
        if (teamChanged) {
            Integer targetTeam = Objects.requireNonNull(nextTeam);
            final String existingId = existing.getId();
            if (targetTeam.compareTo(0) <= 0) {
                throw new IllegalArgumentException("Le num\u00e9ro d'\u00e9quipe doit \u00eatre strictement positif.");
            }
            teamInfoRepository.findByTeam(targetTeam)
                    .filter(other -> !other.getId().equals(existingId))
                    .ifPresent(other -> {
                        throw new IllegalArgumentException(
                                "Le num\u00e9ro d'\u00e9quipe " + targetTeam + " est d\u00e9j\u00e0 utilis\u00e9.");
                    });
            ensureTargetTeamHasNoDependentData(targetTeam);
            existing.setTeam(targetTeam);
            migratedTeam = targetTeam;
            changed = true;
        }
        if (teamInfo.isPresent() != existing.isPresent()) {
            existing.setPresent(teamInfo.isPresent());
            changed = true;
        }
        if (!changed) {
            return existing;
        }

        existing = teamInfoRepository.save(existing);
        if (migratedTeam != null) {
            migrateTeamNumber(previousTeam, migratedTeam);
        }
        messageProducerService.sendMessage(TEAM_INFO_UPDATE_EVENT, existing);
        teamInfoUpdatePublisher.publishTeamInfoUpdate();
        return existing;
    }

    private void ensureTargetTeamHasNoDependentData(Integer nextTeam) {
        if (!responseFileInfoRepository.findByTeam(nextTeam).isEmpty()
                || !stageResponseRepository.findByTeam(nextTeam).isEmpty()
                || !stageResultRepository.findByTeam(nextTeam).isEmpty()
                || teamPointRepository.findByTeam(nextTeam).isPresent()
                || !logFileRepository.findByTeam(nextTeam).isEmpty()
                || stageRankingRepository.findAll().stream()
                        .anyMatch(stageRanking -> containsTeam(stageRanking, nextTeam))) {
            throw new IllegalArgumentException(
                    "Le num\u00e9ro d'\u00e9quipe " + nextTeam + " est d\u00e9j\u00e0 utilis\u00e9 par des donn\u00e9es li\u00e9es.");
        }
    }

    private void migrateTeamNumber(Integer previousTeam, Integer nextTeam) {
        if (Objects.isNull(previousTeam) || Objects.isNull(nextTeam) || previousTeam.equals(nextTeam)) {
            return;
        }

        migrateResponseFileInfos(previousTeam, nextTeam);
        migrateStageResponses(previousTeam, nextTeam);
        migrateStageResults(previousTeam, nextTeam);
        migrateTeamPoint(previousTeam, nextTeam);
        migrateStageRankings(previousTeam, nextTeam);
        migrateLogFiles(previousTeam, nextTeam);
    }

    private void migrateResponseFileInfos(Integer previousTeam, Integer nextTeam) {
        for (ResponseFileInfo responseFileInfo : responseFileInfoRepository.findByTeam(previousTeam)) {
            responseFileInfo.setTeam(nextTeam);
            responseFileInfoRepository.save(responseFileInfo);
        }
    }

    private void migrateStageResponses(Integer previousTeam, Integer nextTeam) {
        for (StageResponse stageResponse : stageResponseRepository.findByTeam(previousTeam)) {
            stageResponse.setTeam(nextTeam);
            stageResponseRepository.save(stageResponse);
        }
    }

    private void migrateStageResults(Integer previousTeam, Integer nextTeam) {
        for (StageResult stageResult : stageResultRepository.findByTeam(previousTeam)) {
            stageResult.setTeam(nextTeam);
            stageResultRepository.save(stageResult);
        }
    }

    private void migrateTeamPoint(Integer previousTeam, Integer nextTeam) {
        teamPointRepository.findByTeam(previousTeam).ifPresent(teamPoint -> {
            teamPoint.setTeam(nextTeam);
            teamPointRepository.save(teamPoint);
        });
    }

    private void migrateStageRankings(Integer previousTeam, Integer nextTeam) {
        for (StageRanking stageRanking : stageRankingRepository.findAll()) {
            boolean updated = migrateTeamRanks(stageRanking.getBegins(), previousTeam, nextTeam);
            updated = migrateTeamRanks(stageRanking.getEnds(), previousTeam, nextTeam) || updated;
            for (List<TeamRank<Double>> ranks : stageRanking.getPerformances().values()) {
                updated = migrateTeamRanks(ranks, previousTeam, nextTeam) || updated;
            }
            if (updated) {
                stageRankingRepository.save(stageRanking);
            }
        }
    }

    private void migrateLogFiles(Integer previousTeam, Integer nextTeam) {
        for (LogFile logFile : logFileRepository.findByTeam(previousTeam)) {
            logFile.setTeam(nextTeam);
            logFileRepository.save(logFile);
        }
    }

    private boolean containsTeam(StageRanking stageRanking, Integer team) {
        return containsTeamRank(stageRanking.getBegins(), team)
                || containsTeamRank(stageRanking.getEnds(), team)
                || stageRanking.getPerformances().values().stream().anyMatch(ranks -> containsTeamRank(ranks, team));
    }

    private <T> boolean containsTeamRank(List<TeamRank<T>> ranks, Integer team) {
        return ranks.stream().anyMatch(rank -> team.equals(rank.getTeam()));
    }

    private <T> boolean migrateTeamRanks(List<TeamRank<T>> ranks, Integer previousTeam, Integer nextTeam) {
        boolean updated = false;
        for (TeamRank<T> rank : ranks) {
            if (previousTeam.equals(rank.getTeam())) {
                rank.setTeam(nextTeam);
                updated = true;
            }
        }
        return updated;
    }
}
