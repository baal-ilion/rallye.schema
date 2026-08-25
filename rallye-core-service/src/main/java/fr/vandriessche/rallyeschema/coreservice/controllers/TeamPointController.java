package fr.vandriessche.rallyeschema.coreservice.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengePoint;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeRankingService;
import fr.vandriessche.rallyeschema.coreservice.services.TeamPointService;
import fr.vandriessche.rallyeschema.coreservice.services.RankingUpdatePublisher;

@RestController
public class TeamPointController {
	@Autowired
	private TeamPointService teamPointService;
	@Autowired
	private ChallengeRankingService challengeRankingService;
	@Autowired
	private RankingUpdatePublisher rankingUpdatePublisher;

	@GetMapping("/teamPoints/recompute")
	public List<TeamPoint> computeTeamPoints() {
		challengeRankingService.computeAllChallengeRanking();
		return teamPointService.computeTeamPoints();
	}

	@PostMapping("/teamPoints/recompute")
	public List<TeamPoint> recomputeTeamPointsAndNotify() {
		challengeRankingService.computeAllChallengeRanking();
		List<TeamPoint> points = teamPointService.computeTeamPoints();
		rankingUpdatePublisher.publishRankingUpdate();
		return points;
	}

	@GetMapping("/teamPoints/{id}")
	public ResponseEntity<TeamPoint> getTeamPoint(@PathVariable String id) {
		return ResponseEntity.ok(teamPointService.getTeamPoint(id));
	}

	@GetMapping("/challengePoints/search/findByChallengeAndTeam")
	public ChallengePoint getTeamPointByChallengeAndTeam(@RequestParam Integer challenge, @RequestParam Integer team) {
		return teamPointService.getTeamPointByChallengeAndTeam(challenge, team);
	}

	@GetMapping("/teamPoints/search/findByTeam")
	public TeamPoint getTeamPointByTeam(@RequestParam Integer team) {
		return teamPointService.getTeamPointByTeam(team);
	}

	@GetMapping("/teamPoints")
	public List<TeamPoint> getTeamPoints() {
		return teamPointService.getTeamPoints();
	}
}
