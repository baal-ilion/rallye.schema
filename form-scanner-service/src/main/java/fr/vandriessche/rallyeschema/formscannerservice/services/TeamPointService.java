package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.formscannerservice.entities.PerformanceRangeType;
import fr.vandriessche.rallyeschema.formscannerservice.entities.QuestionPoint;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseSource;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageParam;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StagePoint;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageRanking;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResponseSource;
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
	@Autowired
	private StageResponseService stageResponseService;

	public TeamPoint computeTeamPoint(Integer team) {
		TeamPoint teamPoint = makeTeamPoint(team);
		List<StageResult> stageResults = stageResultService.getStageResultsByTeam(team);
		teamPoint.setStagePoints(stageResults.stream()
				.filter(stageResult -> Boolean.TRUE.equals(stageResult.getChecked())).map(stageResult -> {
					var stageRanking = stageRankingService.getStageRankingByStage(stageResult.getStage());
					return computeStagePoint(stageResult, stageRanking);
				}).collect(Collectors.toMap(StagePoint::getStage, s -> s)));
		computeTeamPointTotal(teamPoint);
		return save(teamPoint);
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

	private Stream<QuestionPoint> computePerformancePoint(StageResult stageResult, StageRanking stageRanking,
			StageParam stageParam) {
		return stageResult.getPerformances().stream()
				.filter(performance -> Objects.nonNull(performance.getPerformanceValue())).map(performance -> {
					var performancePointParam = stageParam.getPerformancePointParams().get(performance.getName());
					if (Objects.nonNull(performancePointParam)) {
						return new QuestionPoint(performance.getName(),
								performancePointParam.getRanges().stream().map(range -> {
									Double value = null;
									switch (range.getType()) {
									case VALUE:
										value = performance.getPerformanceValue();
										break;
									case BEGIN_DOWN_RANK:
									case BEGIN_UP_RANK:
										value = stageRanking.getBegins().stream()
												.filter(b -> b.getTeam().equals(stageResult.getTeam())).map(rank -> {
													return range.getType() == PerformanceRangeType.BEGIN_UP_RANK
															? rank.getUpRank().doubleValue()
															: rank.getDownRank().doubleValue();
												}).findFirst().orElse(0d);
										break;
									case END_DOWN_RANK:
									case END_UP_RANK:
										value = stageRanking.getEnds().stream()
												.filter(b -> b.getTeam().equals(stageResult.getTeam())).map(rank -> {
													return range.getType() == PerformanceRangeType.END_UP_RANK
															? rank.getUpRank().doubleValue()
															: rank.getDownRank().doubleValue();
												}).findFirst().orElse(0d);
										break;
									case PERF_DOWN_RANK:
									case PERF_UP_RANK:
										value = stageRanking.getPerformances()
												.getOrDefault(performance.getName(), new ArrayList<>()).stream()
												.filter(b -> b.getTeam().equals(stageResult.getTeam())).map(rank -> {
													return range.getType() == PerformanceRangeType.PERF_UP_RANK
															? rank.getUpRank().doubleValue()
															: rank.getDownRank().doubleValue();
												}).findFirst().orElse(0d);
										break;
									default:
										return 0l;
									}
									if ((Objects.isNull(range.getBegin()) || range.getBegin() <= value)
											&& (Objects.isNull(range.getEnd()) || value < range.getEnd()))
										return range.getPoint();
									return 0l;
								}).reduce(0l, Long::sum));
					}
					return null;
				}).filter(Objects::nonNull);
	}

	private Stream<QuestionPoint> computeResultPoint(StageResult stageResult, StageParam stageParam) {
		return stageResult.getResults().stream().filter(result -> Boolean.TRUE.equals(result.getResultValue()))
				.map(result -> {
					var questionPointParam = stageParam.getQuestionPointParams().get(result.getName());
					if (Objects.nonNull(questionPointParam) && Objects.nonNull(questionPointParam.getPoint()))
						return new QuestionPoint(result.getName(), questionPointParam.getPoint());
					return null;
				}).filter(Objects::nonNull);
	}

	private boolean computeStagePoint(StagePoint stagePoint, ResponseSource source) {
		var stageResponse = stageResponseService.getStageResponse(source.getId());
		if (Boolean.TRUE.equals(((StageResponseSource) source).getPointUsed())
				&& (Objects.nonNull(stageResponse.getQuestions()) || Objects.nonNull(stageResponse.getTotal()))) {
			stagePoint.setQuestions(
					Objects.nonNull(stageResponse.getQuestions()) ? stageResponse.getQuestions() : new ArrayList<>());
			stagePoint.setTotal(Objects.nonNull(stageResponse.getTotal()) ? stageResponse.getTotal()
					: sumQuestionPoint(stagePoint));
			return true;
		}
		return false;
	}

	private void computeStagePoint(StagePoint stagePoint, StageResult stageResult, StageRanking stageRanking,
			StageParam stageParam) {
		stagePoint.setQuestions(Stream
				.concat(computeResultPoint(stageResult, stageParam),
						computePerformancePoint(stageResult, stageRanking, stageParam))
				.sorted(Comparator.comparing(QuestionPoint::getName)).collect(Collectors.toList()));
		stagePoint.setTotal(sumQuestionPoint(stagePoint));
	}

	private StagePoint computeStagePoint(StageResult stageResult, StageRanking stageRanking) {
		StagePoint stagePoint = new StagePoint(stageResult.getStage(), 0l);
		var stageParam = stageParamService.getStageParamByStage(stageResult.getStage());
		if (Boolean.TRUE.equals(stageResult.getChecked())) {
			stageResult.getResponseSources().stream().filter(source -> source instanceof StageResponseSource)
					.findFirst().ifPresentOrElse(source -> {
						if (!computeStagePoint(stagePoint, source)) {
							computeStagePoint(stagePoint, stageResult, stageRanking, stageParam);
						}
					}, () -> computeStagePoint(stagePoint, stageResult, stageRanking, stageParam));
		}
		return stagePoint;
	}

	private TeamPoint computeTeamPointFromStageResult(StageResult stageResult, StageRanking stageRanking) {
		TeamPoint teamPoint = makeTeamPoint(stageResult.getTeam());
		teamPoint.getStagePoints().put(stageResult.getStage(), computeStagePoint(stageResult, stageRanking));
		computeTeamPointTotal(teamPoint);
		return save(teamPoint);
	}

	private void computeTeamPointTotal(TeamPoint teamPoint) {
		teamPoint
				.setTotal(teamPoint.getStagePoints().values().stream().map(StagePoint::getTotal).reduce(0l, Long::sum));
	}

	private TeamPoint makeTeamPoint(Integer team) {
		return teamPointRepository.findByTeam(team).orElse(new TeamPoint(team));
	}

	private TeamPoint save(TeamPoint teamPoint) {
		return teamPointRepository.save(teamPoint);
	}

	private Long sumQuestionPoint(StagePoint stagePoint) {
		return stagePoint.getQuestions().stream().map(QuestionPoint::getTotal).reduce(0l, Long::sum);
	}

}
