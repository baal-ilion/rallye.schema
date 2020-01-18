package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.formscannerservice.entities.StagePoint;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageRanking;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResult;
import fr.vandriessche.rallyeschema.formscannerservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.formscannerservice.entities.TeamRank;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.TeamPointRepository;
import lombok.NonNull;

@Service
public class TeamPointService {
	@Autowired
	private TeamPointRepository teamPointRepository;
	@Autowired
	private StageResultService stageResultService;
	@Autowired
	private StageParamService stageParamService;
	@Autowired
	private StageRankingService stageRankingService;

	public TeamPoint computeTeamPoint(Integer team) {
		TeamPoint teamPoint = makeTeamPoint(team);
		List<StageResult> stageResults = stageResultService.getStageResultsByTeam(team);
		teamPoint.setStagePoints(
				stageResults.stream().filter(stageResult -> Boolean.TRUE.equals(stageResult.getChecked()))
						.map(stageResult -> computeStagePoint(stageResult))
						.collect(Collectors.toMap(StagePoint::getStage, s -> s)));
		computeTeamPointTotal(teamPoint);
		teamPoint = teamPointRepository.save(teamPoint);
		return teamPoint;
	}

	public List<TeamPoint> computeTeamPointFromStageRanking(@NonNull Integer stage) {
		var stageRanking = stageRankingService.getStageRankingByStage(stage);
		return Stream.concat(
				Stream.concat(stageRanking.getBegins().stream().map(TeamRank<LocalDateTime>::getTeam),
						stageRanking.getEnds().stream().map(TeamRank<LocalDateTime>::getTeam)),
				stageRanking.getPerformances().values().stream().flatMap(m -> m.stream())
						.map(TeamRank<Double>::getTeam))
				.distinct().sorted().map(team -> {
					var stageResult = stageResultService.getStageResultByStageAndTeam(stage, team);
					return computeTeamPointFromStageResult(stageResult, stageRanking);
				}).collect(Collectors.toList());
	}

	public TeamPoint computeTeamPointFromStageResult(@NonNull String stageResultId) {
		var stageResult = stageResultService.getStageResult(stageResultId);
		var stageRanking = stageRankingService.getStageRankingByStage(stageResult.getStage());
		return computeTeamPointFromStageResult(stageResult, stageRanking);
	}

	public List<TeamPoint> computeTeamPoints() {
		List<StageResult> stageResults = stageResultService.getStageResults();
		return stageResults.stream().map(StageResult::getTeam).distinct().map(team -> computeTeamPoint(team))
				.collect(Collectors.toList());
	}

	public TeamPoint getTeamPoint(String id) {
		return teamPointRepository.findById(id).orElseThrow();
	}

	public StagePoint getTeamPointByStageAndTeam(Integer stage, Integer team) {
		TeamPoint teamPoint = teamPointRepository.findByTeam(team).orElse(null);
		if (Objects.nonNull(teamPoint))
			return teamPoint.getStagePoints().get(stage);
		return null;
	}

	public TeamPoint getTeamPointByTeam(Integer team) {
		return teamPointRepository.findByTeam(team).orElse(null);
	}

	public List<TeamPoint> getTeamPoints() {
		return teamPointRepository.findAll();
	}

	private StagePoint computeStagePoint(StageResult stageResult) {
		StagePoint stagePoint = new StagePoint(stageResult.getStage(), 0l);
		var stageParam = stageParamService.getStageParamByStage(stageResult.getStage());
		if (Boolean.TRUE.equals(stageResult.getChecked())) {
			stagePoint.setTotal(stageResult.getResults().stream()
					.filter(result -> Boolean.TRUE.equals(result.getResultValue())).map(result -> {
						var questionPointParam = stageParam.getQuestionPointParams().get(result.getName());
						if (Objects.nonNull(questionPointParam) && Objects.nonNull(questionPointParam.getPoint()))
							return questionPointParam.getPoint();
						return 0l;
					}).reduce(0l, Long::sum));
		}
		return stagePoint;
	}

	private TeamPoint computeTeamPointFromStageResult(StageResult stageResult, StageRanking stageRanking) {
		TeamPoint teamPoint = makeTeamPoint(stageResult.getTeam());
		teamPoint.getStagePoints().put(stageResult.getStage(), computeStagePoint(stageResult));
		computeTeamPointTotal(teamPoint);
		teamPoint = teamPointRepository.save(teamPoint);
		return teamPoint;
	}

	private void computeTeamPointTotal(TeamPoint teamPoint) {
		teamPoint
				.setTotal(teamPoint.getStagePoints().values().stream().map(StagePoint::getTotal).reduce(0l, Long::sum));
	}

	private TeamPoint makeTeamPoint(Integer team) {
		return teamPointRepository.findByTeam(team).orElse(new TeamPoint(team));
	}

}
