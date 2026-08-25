package fr.vandriessche.rallyeschema.coreservice.services;

import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.coreservice.entities.LogFile;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeRanking;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import fr.vandriessche.rallyeschema.coreservice.entities.Team;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamRank;
import fr.vandriessche.rallyeschema.coreservice.repositories.LogFileRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.SubmittedFormMetadataRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeRankingRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResponseRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResultRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamPointRepository;

@Service
public class TeamService {

    public static final String TEAM_CREATE_EVENT = "team.create";
    public static final String TEAM_UPDATE_EVENT = "team.update";
    public static final String TEAM_DELETE_EVENT = "team.delete";

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private SubmittedFormMetadataRepository submittedFormMetadataRepository;

    @Autowired
    private ChallengeResponseRepository challengeResponseRepository;

    @Autowired
    private ChallengeResultRepository challengeResultRepository;

    @Autowired
    private ChallengeRankingRepository challengeRankingRepository;

    @Autowired
    private TeamPointRepository teamPointRepository;

    @Autowired
    private LogFileRepository logFileRepository;

    @Autowired
    private MessageProducerService messageProducerService;

    @Autowired
    private TeamUpdatePublisher teamUpdatePublisher;

    @Autowired
    private SubmittedFormService submittedFormService;

    @Autowired
    private ChallengeResponseService challengeResponseService;

    @Autowired
    private ChallengeResultService challengeResultService;

    @Autowired
    private TeamPointService teamPointService;

    public Team addTeam(Team team) {
        team.setPresent(false);
        team = teamRepository.save(team);
        messageProducerService.sendMessage(TEAM_CREATE_EVENT, team);
        teamUpdatePublisher.publishTeamUpdate();
        return team;
    }

    public long countTeam() {
        return teamRepository.count();
    }

    public void deleteTeam(String id) {
        var team = teamRepository.findById(id).orElseThrow();

        Integer teamNumber = team.getTeam();
        if (teamNumber != null) {
            try {
                submittedFormService.deleteByTeam(teamNumber);
            } catch (Exception ignored) {
            }
            try {
                challengeResponseService.deleteByTeam(teamNumber);
            } catch (Exception ignored) {
            }
            try {
                challengeResultService.deleteByTeam(teamNumber);
            } catch (Exception ignored) {
            }
            try {
                teamPointService.deleteByTeam(teamNumber);
            } catch (Exception ignored) {
            }
        }

        teamRepository.deleteById(id);
        messageProducerService.sendMessage(TEAM_DELETE_EVENT, team);
        teamUpdatePublisher.publishTeamUpdate();
    }

    public Team getTeam(String id) {
        return teamRepository.findById(id).orElseThrow();
    }

    public Team getTeamByName(String name) {
        return teamRepository.findByName(name).orElse(null);
    }

    public Team getTeamByTeam(Integer team) {
        return teamRepository.findByTeam(team).orElse(null);
    }

    public List<Team> getTeams() {
        return teamRepository.findAll();
    }

    public List<Team> getPresentTeams() {
        return teamRepository.findByPresentTrue();
    }

    public List<Team> getAbsentTeams() {
        return teamRepository.findByPresentFalse();
    }

    public Team setTeamPresence(String id, boolean present) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Team not found"));
        if (team.isPresent() == present) {
            return team;
        }
        team.setPresent(present);
        team = teamRepository.save(team);
        messageProducerService.sendMessage(TEAM_UPDATE_EVENT, team);
        teamUpdatePublisher.publishTeamUpdate();
        return team;
    }

    public Team markTeamPresent(String id) {
        return setTeamPresence(id, true);
    }

    public Team markTeamAbsent(String id) {
        return setTeamPresence(id, false);
    }

    public Team setTeamPresenceByTeam(Integer teamNumber, boolean present) {
        var team = teamRepository.findByTeam(teamNumber)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Team not found"));
        return setTeamPresence(team.getId(), present);
    }

    public Team updateTeam(Team team) {
        Team existing = team.getId() != null
                ? teamRepository.findById(team.getId())
                        .orElseGet(() -> teamRepository.findByTeam(team.getTeam()).orElseThrow())
                : teamRepository.findByTeam(team.getTeam()).orElseThrow();
        boolean changed = false;
        Integer previousTeam = existing.getTeam();
        Integer nextTeam = team.getTeam();
        Integer migratedTeam = null;
        boolean teamChanged = nextTeam != null && !nextTeam.equals(previousTeam);

        if (team.getName() != null && !team.getName().equals(existing.getName())) {
            existing.setName(team.getName());
            changed = true;
        }
        if (teamChanged) {
            Integer targetTeam = Objects.requireNonNull(nextTeam);
            final String existingId = existing.getId();
            if (targetTeam.compareTo(0) <= 0) {
                throw new IllegalArgumentException("Le num\u00e9ro d'\u00e9quipe doit \u00eatre strictement positif.");
            }
            teamRepository.findByTeam(targetTeam)
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
        if (team.isPresent() != existing.isPresent()) {
            existing.setPresent(team.isPresent());
            changed = true;
        }
        if (!changed) {
            return existing;
        }

        existing = teamRepository.save(existing);
        if (migratedTeam != null) {
            migrateTeamNumber(previousTeam, migratedTeam);
        }
        messageProducerService.sendMessage(TEAM_UPDATE_EVENT, existing);
        teamUpdatePublisher.publishTeamUpdate();
        return existing;
    }

    private void ensureTargetTeamHasNoDependentData(Integer nextTeam) {
        if (!submittedFormMetadataRepository.findByTeam(nextTeam).isEmpty()
                || !challengeResponseRepository.findByTeam(nextTeam).isEmpty()
                || !challengeResultRepository.findByTeam(nextTeam).isEmpty()
                || teamPointRepository.findByTeam(nextTeam).isPresent()
                || !logFileRepository.findByTeam(nextTeam).isEmpty()
                || challengeRankingRepository.findAll().stream()
                        .anyMatch(challengeRanking -> containsTeam(challengeRanking, nextTeam))) {
            throw new IllegalArgumentException(
                    "Le num\u00e9ro d'\u00e9quipe " + nextTeam + " est d\u00e9j\u00e0 utilis\u00e9 par des donn\u00e9es li\u00e9es.");
        }
    }

    private void migrateTeamNumber(Integer previousTeam, Integer nextTeam) {
        if (Objects.isNull(previousTeam) || Objects.isNull(nextTeam) || previousTeam.equals(nextTeam)) {
            return;
        }

        migrateSubmittedFormMetadatas(previousTeam, nextTeam);
        migrateChallengeResponses(previousTeam, nextTeam);
        migrateChallengeResults(previousTeam, nextTeam);
        migrateTeamPoint(previousTeam, nextTeam);
        migrateChallengeRankings(previousTeam, nextTeam);
        migrateLogFiles(previousTeam, nextTeam);
    }

    private void migrateSubmittedFormMetadatas(Integer previousTeam, Integer nextTeam) {
        for (SubmittedFormMetadata submittedFormMetadata : submittedFormMetadataRepository.findByTeam(previousTeam)) {
            submittedFormMetadata.setTeam(nextTeam);
            submittedFormMetadataRepository.save(submittedFormMetadata);
        }
    }

    private void migrateChallengeResponses(Integer previousTeam, Integer nextTeam) {
        for (ChallengeResponse challengeResponse : challengeResponseRepository.findByTeam(previousTeam)) {
            challengeResponse.setTeam(nextTeam);
            challengeResponseRepository.save(challengeResponse);
        }
    }

    private void migrateChallengeResults(Integer previousTeam, Integer nextTeam) {
        for (ChallengeResult challengeResult : challengeResultRepository.findByTeam(previousTeam)) {
            challengeResult.setTeam(nextTeam);
            challengeResultRepository.save(challengeResult);
        }
    }

    private void migrateTeamPoint(Integer previousTeam, Integer nextTeam) {
        teamPointRepository.findByTeam(previousTeam).ifPresent(teamPoint -> {
            teamPoint.setTeam(nextTeam);
            teamPointRepository.save(teamPoint);
        });
    }

    private void migrateChallengeRankings(Integer previousTeam, Integer nextTeam) {
        for (ChallengeRanking challengeRanking : challengeRankingRepository.findAll()) {
            boolean updated = migrateTeamRanks(challengeRanking.getBegins(), previousTeam, nextTeam);
            updated = migrateTeamRanks(challengeRanking.getEnds(), previousTeam, nextTeam) || updated;
            for (List<TeamRank<Double>> ranks : challengeRanking.getPerformances().values()) {
                updated = migrateTeamRanks(ranks, previousTeam, nextTeam) || updated;
            }
            if (updated) {
                challengeRankingRepository.save(challengeRanking);
            }
        }
    }

    private void migrateLogFiles(Integer previousTeam, Integer nextTeam) {
        for (LogFile logFile : logFileRepository.findByTeam(previousTeam)) {
            logFile.setTeam(nextTeam);
            logFileRepository.save(logFile);
        }
    }

    private boolean containsTeam(ChallengeRanking challengeRanking, Integer team) {
        return containsTeamRank(challengeRanking.getBegins(), team)
                || containsTeamRank(challengeRanking.getEnds(), team)
                || challengeRanking.getPerformances().values().stream().anyMatch(ranks -> containsTeamRank(ranks, team));
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
