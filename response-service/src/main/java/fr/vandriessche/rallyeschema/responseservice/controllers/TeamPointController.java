package fr.vandriessche.rallyeschema.responseservice.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.responseservice.entities.StagePoint;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.responseservice.services.StageRankingService;
import fr.vandriessche.rallyeschema.responseservice.services.TeamPointService;

@RestController
public class TeamPointController {
	@Autowired
	private TeamPointService teamPointService;
	@Autowired
	private StageRankingService stageRankingService;

	@GetMapping("/teamPoints/recompute")
	public List<TeamPoint> computeTeamPoints() {
		stageRankingService.computeAllStageRanking();
		return teamPointService.computeTeamPoints();
	}

	@GetMapping("/teamPoint/{id}")
	public ResponseEntity<TeamPoint> getTeamPoint(@PathVariable String id) {
		return ResponseEntity.ok(teamPointService.getTeamPoint(id));
	}

	@GetMapping("/stagePoint/search/findByStageAndTeam")
	public StagePoint getTeamPointByStageAndTeam(@RequestParam Integer stage, @RequestParam Integer team) {
		return teamPointService.getTeamPointByStageAndTeam(stage, team);
	}

	@GetMapping("/teamPoint/search/findByTeam")
	public TeamPoint getTeamPointByTeam(@RequestParam Integer team) {
		return teamPointService.getTeamPointByTeam(team);
	}

	@GetMapping("/teamPoints")
	public List<TeamPoint> getTeamPoints() {
		return teamPointService.getTeamPoints();
	}
}
