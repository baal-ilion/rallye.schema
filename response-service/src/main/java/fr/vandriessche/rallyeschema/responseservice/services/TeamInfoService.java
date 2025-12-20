package fr.vandriessche.rallyeschema.responseservice.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamInfoRepository;

@Service
public class TeamInfoService {

    public static final String TEAM_INFO_CREATE_EVENT = "teamInfo.create";
    public static final String TEAM_INFO_UPDATE_EVENT = "teamInfo.update";
    public static final String TEAM_INFO_DELETE_EVENT = "teamInfo.delete";

    @Autowired
    private TeamInfoRepository teamInfoRepository;

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

        // nettoyage immédiat des données liées à l'équipe
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
                ? teamInfoRepository.findById(teamInfo.getId()).orElseGet(() -> teamInfoRepository.findByTeam(teamInfo.getTeam()).orElseThrow())
                : teamInfoRepository.findByTeam(teamInfo.getTeam()).orElseThrow();
        boolean changed = false;
        if (teamInfo.getName() != null && !teamInfo.getName().equals(existing.getName())) {
            existing.setName(teamInfo.getName());
            changed = true;
        }
        if (teamInfo.getTeam() != null && !teamInfo.getTeam().equals(existing.getTeam())) {
            existing.setTeam(teamInfo.getTeam());
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
        messageProducerService.sendMessage(TEAM_INFO_UPDATE_EVENT, existing);
        teamInfoUpdatePublisher.publishTeamInfoUpdate();
        return existing;
    }
}
