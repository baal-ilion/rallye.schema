package fr.vandriessche.rallyeschema.responseservice.services;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.responseservice.entities.PerformanceRangePointParam;
import fr.vandriessche.rallyeschema.responseservice.entities.PerformanceRangeType;
import fr.vandriessche.rallyeschema.responseservice.entities.PerformanceResult;
import fr.vandriessche.rallyeschema.responseservice.entities.QuestionPoint;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseSource;
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StagePoint;
import fr.vandriessche.rallyeschema.responseservice.entities.StageRanking;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResponseSource;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamRank;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamPointRepository;
import lombok.NonNull;
import lombok.extern.java.Log;

@Service
@Log
public class TeamPointService {
	@SuppressWarnings("unused")
	private static Long toLongHelper(Double i) {
		return i.longValue();
	}

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
	@Autowired
	private TeamInfoService teamInfoService;

	private ExpressionParser parser = new SpelExpressionParser();

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
				Stream.concat(stageRanking.getBegins().stream().map(TeamRank<Instant>::getTeam),
						stageRanking.getEnds().stream().map(TeamRank<Instant>::getTeam)),
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

	private long computePerformancePoint(StageRanking stageRanking, PerformanceRangePointParam range, long nbTeam,
			Double value) {
		if (Objects.nonNull(range.getPoint()))
			return range.getPoint();
		if (Objects.nonNull(range.getExpression()) && !range.getExpression().isBlank()) {
			try {
				StandardEvaluationContext context = new StandardEvaluationContext();
				context.setVariable("valeur", value);
				context.setVariable("nbEqInscrites", nbTeam);
				context.setVariable("nbEqParticipantes", stageRanking.getEnds().size());
				context.registerFunction("arrondi",
						TeamPointService.class.getDeclaredMethod("toLongHelper", new Class[] { Double.class }));
				return parser.parseExpression(range.getExpression()).getValue(context, Long.class);
			} catch (Exception e) {
				log.log(Level.WARNING, "Expression : " + range.getExpression() + " [#valeur=" + value
						+ ", #nbEqInscrites=" + nbTeam + ", #nbEqParticipantes=" + stageRanking.getEnds().size() + "] ",
						e);
			}
		}
		return 0l;
	}

	private Stream<QuestionPoint> computePerformancePoint(StageResult stageResult, StageRanking stageRanking,
			StageParam stageParam, List<String> sourceQuestionNames) {
		var nbTeam = teamInfoService.countTeamInfo();
		return stageResult.getPerformances().stream()
				.filter(performance -> Objects.nonNull(performance.getPerformanceValue()))
				.filter(performance -> !sourceQuestionNames.contains(performance.getName())).map(performance -> {
					var performancePointParam = stageParam.getPerformancePointParams().get(performance.getName());
					if (Objects.nonNull(performancePointParam)) {
						return new QuestionPoint(performance.getName(),
								performancePointParam.getRanges().stream().map(range -> {
									Double value = computePerformancePointValue(stageResult, stageRanking, range,
											performance);
									if (Objects.nonNull(value)
											&& (Objects.isNull(range.getBegin()) || range.getBegin() <= value)
											&& (Objects.isNull(range.getEnd()) || value < range.getEnd()))
										return computePerformancePoint(stageRanking, range, nbTeam, value);
									return 0l;
								}).reduce(0l, Long::sum));
					}
					return null;
				}).filter(Objects::nonNull);
	}

	private Double computePerformancePointValue(StageResult stageResult, StageRanking stageRanking,
			PerformanceRangePointParam range, PerformanceResult performance) {
		switch (range.getType()) {
		case VALUE:
			return performance.getPerformanceValue();
		case BEGIN_DOWN_RANK:
		case BEGIN_UP_RANK:
			return stageRanking.getBegins().stream().filter(b -> b.getTeam().equals(stageResult.getTeam()))
					.map(rank -> range.getType() == PerformanceRangeType.BEGIN_UP_RANK ? rank.getUpRank().doubleValue()
							: rank.getDownRank().doubleValue())
					.findFirst().orElse(0d);
		case END_DOWN_RANK:
		case END_UP_RANK:
			return stageRanking.getEnds().stream().filter(b -> b.getTeam().equals(stageResult.getTeam()))
					.map(rank -> range.getType() == PerformanceRangeType.END_UP_RANK ? rank.getUpRank().doubleValue()
							: rank.getDownRank().doubleValue())
					.findFirst().orElse(0d);
		case PERF_DOWN_RANK:
		case PERF_UP_RANK:
			return stageRanking.getPerformances().getOrDefault(performance.getName(), new ArrayList<>()).stream()
					.filter(b -> b.getTeam().equals(stageResult.getTeam()))
					.map(rank -> range.getType() == PerformanceRangeType.PERF_UP_RANK ? rank.getUpRank().doubleValue()
							: rank.getDownRank().doubleValue())
					.findFirst().orElse(0d);
		default:
			return null;
		}
	}

	private Stream<QuestionPoint> computeResultPoint(StageResult stageResult, StageParam stageParam,
			List<String> sourceQuestionNames) {
		return stageResult.getResults().stream().filter(result -> Boolean.TRUE.equals(result.getResultValue()))
				.filter(result -> !sourceQuestionNames.contains(result.getName())).map(result -> {
					var questionPointParam = stageParam.getQuestionPointParams().get(result.getName());
					if (Objects.nonNull(questionPointParam) && Objects.nonNull(questionPointParam.getPoint()))
						return new QuestionPoint(result.getName(), questionPointParam.getPoint());
					return null;
				}).filter(Objects::nonNull);
	}

	private List<String> computeStagePoint(StagePoint stagePoint, ResponseSource source) {
		if (Objects.nonNull(source)) {
			var stageResponse = stageResponseService.getStageResponse(source.getId());
			if (Boolean.TRUE.equals(((StageResponseSource) source).getPointUsed())
					&& (Objects.nonNull(stageResponse.getQuestions()) || Objects.nonNull(stageResponse.getTotal()))) {
				stagePoint.setQuestions(Objects.nonNull(stageResponse.getQuestions()) ? stageResponse.getQuestions()
						: new ArrayList<>());
				stagePoint.setTotal(Objects.nonNull(stageResponse.getTotal()) ? stageResponse.getTotal()
						: sumQuestionPoint(stagePoint.getQuestions()));
				return Stream
						.concat(stageResponse.getQuestions().stream().map(QuestionPoint::getName),
								Stream.concat(stageResponse.getPerformances().stream().map(PerformanceResult::getName),
										stageResponse.getResults().stream().map(ResponseResult::getName)))
						.distinct().collect(Collectors.toList());
			}
		}

		stagePoint.setQuestions(new ArrayList<>());
		stagePoint.setTotal(0l);
		return new ArrayList<>();
	}

	private void computeStagePoint(StagePoint stagePoint, StageResult stageResult, StageRanking stageRanking,
			StageParam stageParam, ResponseSource source) {
		var sourceQuestionNames = computeStagePoint(stagePoint, source);
		var questions = Stream
				.concat(computeResultPoint(stageResult, stageParam, sourceQuestionNames),
						computePerformancePoint(stageResult, stageRanking, stageParam, sourceQuestionNames))
				.collect(Collectors.toList());
		stagePoint.setQuestions(Stream.concat(stagePoint.getQuestions().stream(), questions.stream())
				.sorted(Comparator.comparing(QuestionPoint::getName)).collect(Collectors.toList()));
		stagePoint.setTotal(stagePoint.getTotal() + sumQuestionPoint(questions));
	}

	private StagePoint computeStagePoint(StageResult stageResult, StageRanking stageRanking) {
		StagePoint stagePoint = new StagePoint(stageResult.getStage(), 0l);
		var stageParam = stageParamService.getStageParamByStage(stageResult.getStage());
		if (Boolean.TRUE.equals(stageResult.getChecked())) {
			var source = stageResult.getResponseSources().stream().filter(s -> s instanceof StageResponseSource)
					.findFirst().orElse(null);
			computeStagePoint(stagePoint, stageResult, stageRanking, stageParam, source);
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

	private Long sumQuestionPoint(List<QuestionPoint> questions) {
		return questions.stream().map(QuestionPoint::getTotal).reduce(0l, Long::sum);
	}

}
