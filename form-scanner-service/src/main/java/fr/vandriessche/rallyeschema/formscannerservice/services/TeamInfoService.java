package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.formscannerservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.TeamInfoRepository;

@Service
public class TeamInfoService {
	@Autowired
	private TeamInfoRepository teamInfoRepository;

	public TeamInfo getTeamInfo(String id) {
		return teamInfoRepository.findById(id).orElseThrow();
	}

	public TeamInfo getTeamInfoByTeam(Integer team) {
		return teamInfoRepository.findByTeam(team).orElse(null);
	}

	public TeamInfo getTeamInfoByName(String name) {
		return teamInfoRepository.findByName(name).orElse(null);
	}

	public List<TeamInfo> getTeamInfos() {
		return teamInfoRepository.findAll();
	}

	public TeamInfo addTeamInfo(TeamInfo teamInfo) {
		return teamInfoRepository.save(teamInfo);
	}

	public TeamInfo updateTeamInfo(TeamInfo teamInfo) {
		teamInfoRepository.findById(teamInfo.getId()).orElseThrow();
		return teamInfoRepository.save(teamInfo);
	}
}
