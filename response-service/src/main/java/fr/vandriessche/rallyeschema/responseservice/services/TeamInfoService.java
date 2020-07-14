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

	public TeamInfo addTeamInfo(TeamInfo teamInfo) {
		teamInfo = teamInfoRepository.save(teamInfo);
		messageProducerService.sendMessage(TEAM_INFO_CREATE_EVENT, teamInfo);
		return teamInfo;
	}

	public long countTeamInfo() {
		return teamInfoRepository.count();
	}

	public void deleteTeamInfo(String id) {
		var teamInfo = teamInfoRepository.findById(id).orElseThrow();
		teamInfoRepository.deleteById(id);
		messageProducerService.sendMessage(TEAM_INFO_DELETE_EVENT, teamInfo);
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

	public TeamInfo updateTeamInfo(TeamInfo teamInfo) {
		teamInfoRepository.findById(teamInfo.getId()).orElseThrow();
		teamInfo = teamInfoRepository.save(teamInfo);
		messageProducerService.sendMessage(TEAM_INFO_UPDATE_EVENT, teamInfo);
		return teamInfo;
	}
}
