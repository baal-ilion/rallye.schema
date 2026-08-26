package fr.vandriessche.rallyeschema.coreservice.services;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.logging.Level;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.coreservice.entities.PerformanceScoringRange;
import fr.vandriessche.rallyeschema.coreservice.entities.PerformanceRangeType;
import fr.vandriessche.rallyeschema.coreservice.entities.PerformanceResult;
import fr.vandriessche.rallyeschema.coreservice.entities.QuestionPoint;
import fr.vandriessche.rallyeschema.coreservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.coreservice.entities.ResponseSource;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengePoint;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeRanking;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponseSource;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamRank;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamPointRepository;
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
	private ChallengeResultService challengeResultService;
	@Autowired
	private ChallengeConfigurationService challengeConfigurationService;
	@Autowired
	private ChallengeRankingService challengeRankingService;
	@Autowired
	private ChallengeResponseService challengeResponseService;
	@Autowired
	private TeamService teamService;

	private ExpressionParser parser = new SpelExpressionParser();

	public TeamPoint computeTeamPoint(Integer team) {
		TeamPoint teamPoint = makeTeamPoint(team);
		List<ChallengeResult> challengeResults = challengeResultService.getChallengeResultsByTeam(team);
		teamPoint.setChallengePoints(challengeResults.stream()
				.filter(challengeResult -> Boolean.TRUE.equals(challengeResult.getChecked())).map(challengeResult -> {
					var challengeRanking = challengeRankingService.getChallengeRankingByChallenge(challengeResult.getChallenge());
					return computeChallengePoint(challengeResult, challengeRanking);
				}).filter(Optional<ChallengePoint>::isPresent).map(challengePoint -> challengePoint.orElse(null))
				.collect(Collectors.toMap(ChallengePoint::getChallenge, s -> s)));
		computeTeamPointTotal(teamPoint);
		return save(teamPoint);
	}

	public TeamPoint computeTeamPointFromDeletedChallengeResult(Integer challenge, Integer team) {
		TeamPoint teamPoint = teamPointRepository.findByTeam(team).orElse(null);
		if (Objects.nonNull(teamPoint)) {
			teamPoint.getChallengePoints().remove(challenge);
			computeTeamPointTotal(teamPoint);
			return save(teamPoint);
		}
		return null;
	}

	public List<TeamPoint> computeTeamPointFromChallengeRanking(@NonNull Integer challenge) {
		var challengeRanking = challengeRankingService.getChallengeRankingByChallenge(challenge);
		if (challengeRanking == null) {
			return new ArrayList<>();
		}
		return Stream.concat(
				Stream.concat(challengeRanking.getBegins().stream().map(TeamRank<Instant>::getTeam),
						challengeRanking.getEnds().stream().map(TeamRank<Instant>::getTeam)),
				challengeRanking.getPerformances().values().stream().flatMap(m -> m.stream())
						.map(TeamRank<Double>::getTeam))
				.distinct().sorted().map(team -> {
					var challengeResult = challengeResultService.getChallengeResultByChallengeAndTeam(challenge, team);
					return computeTeamPointFromChallengeResult(challengeResult, challengeRanking);
				}).collect(Collectors.toList());
	}

	public TeamPoint computeTeamPointFromChallengeResult(@NonNull String challengeResultId) {
		var challengeResult = challengeResultService.getChallengeResult(challengeResultId);
		var challengeRanking = challengeRankingService.getChallengeRankingByChallenge(challengeResult.getChallenge());
		return computeTeamPointFromChallengeResult(challengeResult, challengeRanking);
	}

	public List<TeamPoint> computeTeamPoints() {
		List<ChallengeResult> challengeResults = challengeResultService.getChallengeResults();
		return challengeResults.stream().map(ChallengeResult::getTeam).distinct().map(team -> computeTeamPoint(team))
				.collect(Collectors.toList());
	}

	public void deleteByTeam(Integer team) {
		teamPointRepository.findByTeam(team).ifPresent(teamPoint -> teamPointRepository.delete(teamPoint));
	}

	public void removeChallenge(Integer challenge) {
		teamPointRepository.findAll().forEach(teamPoint -> {
			if (teamPoint.getChallengePoints().remove(challenge) != null) {
				computeTeamPointTotal(teamPoint);
				save(teamPoint);
			}
		});
	}

	public TeamPoint getTeamPoint(String id) {
		return teamPointRepository.findById(id).orElseThrow();
	}

	public ChallengePoint getTeamPointByChallengeAndTeam(Integer challenge, Integer team) {
		TeamPoint teamPoint = teamPointRepository.findByTeam(team).orElse(null);
		if (Objects.nonNull(teamPoint))
			return teamPoint.getChallengePoints().get(challenge);
		return null;
	}

	public TeamPoint getTeamPointByTeam(Integer team) {
		return teamPointRepository.findByTeam(team).orElse(null);
	}

	public List<TeamPoint> getTeamPoints() {
		return teamPointRepository.findAll();
	}

	private long computePerformancePoint(ChallengeRanking challengeRanking, PerformanceScoringRange range, long nbTeam,
			Double value) {
		if (Objects.nonNull(range.getPoint()))
			return range.getPoint();
		if (Objects.nonNull(range.getExpression()) && !range.getExpression().isBlank()) {
			try {
				StandardEvaluationContext context = new StandardEvaluationContext();
				context.setVariable("valeur", value);
				context.setVariable("nbEqInscrites", nbTeam);
				context.setVariable("nbEqParticipantes", challengeRanking.getEnds().size());
				context.registerFunction("arrondi",
						TeamPointService.class.getDeclaredMethod("toLongHelper", new Class[] { Double.class }));
				Long expressionValue = parser.parseExpression(normalizeDecimalSeparators(range.getExpression())).getValue(context, Long.class);
				return expressionValue != null ? expressionValue : 0L;
			} catch (Exception e) {
				log.log(Level.WARNING, "Expression : " + range.getExpression() + " [#valeur=" + value
						+ ", #nbEqInscrites=" + nbTeam + ", #nbEqParticipantes=" + challengeRanking.getEnds().size() + "] ",
						e);
			}
		}
		return 0l;
	}

	private String normalizeDecimalSeparators(String expression) {
		return expression.replaceAll("(?<=\\d),(?=\\d)", ".");
	}

	private Stream<QuestionPoint> computePerformancePoint(ChallengeResult challengeResult, ChallengeRanking challengeRanking,
			ChallengeConfiguration challengeConfiguration, List<String> sourceQuestionNames) {
		var nbTeam = teamService.countTeam();
		return challengeResult.getPerformances().stream()
				.filter(performance -> Objects.nonNull(performance.getPerformanceValue()))
				.filter(performance -> !sourceQuestionNames.contains(performance.getName())).map(performance -> {
					var performanceScoring = challengeConfiguration.getPerformanceScorings().get(performance.getName());
					if (Objects.nonNull(performanceScoring)) {
						return new QuestionPoint(performance.getName(),
								performanceScoring.getRanges().stream().map(range -> {
									Double value = computePerformancePointValue(challengeResult, challengeRanking, range,
											performance);
									if (Objects.nonNull(value)
											&& (Objects.isNull(range.getBegin()) || range.getBegin() <= value)
											&& (Objects.isNull(range.getEnd()) || value < range.getEnd()))
										return computePerformancePoint(challengeRanking, range, nbTeam, value);
									return 0l;
								}).reduce(0l, Long::sum));
					}
					return null;
				}).filter(Objects::nonNull);
	}

	private Double computePerformancePointValue(ChallengeResult challengeResult, ChallengeRanking challengeRanking,
			PerformanceScoringRange range, PerformanceResult performance) {
		switch (range.getType()) {
		case VALUE:
			return performance.getPerformanceValue();
		case BEGIN_DOWN_RANK:
		case BEGIN_UP_RANK:
			return challengeRanking.getBegins().stream().filter(b -> b.getTeam().equals(challengeResult.getTeam()))
					.map(rank -> range.getType() == PerformanceRangeType.BEGIN_UP_RANK ? rank.getUpRank().doubleValue()
							: rank.getDownRank().doubleValue())
					.findFirst().orElse(0d);
		case END_DOWN_RANK:
		case END_UP_RANK:
			return challengeRanking.getEnds().stream().filter(b -> b.getTeam().equals(challengeResult.getTeam()))
					.map(rank -> range.getType() == PerformanceRangeType.END_UP_RANK ? rank.getUpRank().doubleValue()
							: rank.getDownRank().doubleValue())
					.findFirst().orElse(0d);
		case PERF_DOWN_RANK:
		case PERF_UP_RANK:
			return challengeRanking.getPerformances().getOrDefault(performance.getName(), new ArrayList<>()).stream()
					.filter(b -> b.getTeam().equals(challengeResult.getTeam()))
					.map(rank -> range.getType() == PerformanceRangeType.PERF_UP_RANK ? rank.getUpRank().doubleValue()
							: rank.getDownRank().doubleValue())
					.findFirst().orElse(0d);
		default:
			return null;
		}
	}

	private Stream<QuestionPoint> computeResultPoint(ChallengeResult challengeResult, ChallengeConfiguration challengeConfiguration,
			List<String> sourceQuestionNames) {
		return challengeResult.getResults().stream().filter(result -> Boolean.TRUE.equals(result.getResultValue()))
				.filter(result -> !sourceQuestionNames.contains(result.getName())).map(result -> {
					var questionScoring = challengeConfiguration.getQuestionScorings().get(result.getName());
					if (Objects.nonNull(questionScoring) && Objects.nonNull(questionScoring.getPoint()))
						return new QuestionPoint(result.getName(), questionScoring.getPoint());
					return null;
				}).filter(Objects::nonNull);
	}

	private List<String> computeChallengePoint(ChallengePoint challengePoint, ResponseSource source) {
		if (Objects.nonNull(source)) {
			var challengeResponse = challengeResponseService.getChallengeResponse(source.getId());
			if (Boolean.TRUE.equals(((ChallengeResponseSource) source).getPointUsed())
					&& (Objects.nonNull(challengeResponse.getQuestions()) || Objects.nonNull(challengeResponse.getTotal()))) {
				challengePoint.setQuestions(Objects.nonNull(challengeResponse.getQuestions()) ? challengeResponse.getQuestions()
						: new ArrayList<>());
				challengePoint.setTotal(Objects.nonNull(challengeResponse.getTotal()) ? challengeResponse.getTotal()
						: sumQuestionPoint(challengePoint.getQuestions()));
				return Stream
						.concat(Optional.ofNullable(challengeResponse.getQuestions()).orElse(new ArrayList<>()).stream()
								.map(QuestionPoint::getName),
								Stream.concat(
										Optional.ofNullable(challengeResponse.getPerformances()).orElse(new ArrayList<>())
												.stream().map(PerformanceResult::getName),
										Optional.ofNullable(challengeResponse.getResults()).orElse(new ArrayList<>())
												.stream().map(ResponseResult::getName)))
						.distinct().collect(Collectors.toList());
			}
		}

		challengePoint.setQuestions(new ArrayList<>());
		challengePoint.setTotal(0l);
		return new ArrayList<>();
	}

	private void computeChallengePoint(ChallengePoint challengePoint, ChallengeResult challengeResult, ChallengeRanking challengeRanking,
			ChallengeConfiguration challengeConfiguration, ResponseSource source) {
		var sourceQuestionNames = computeChallengePoint(challengePoint, source);
		var questions = Stream
				.concat(computeResultPoint(challengeResult, challengeConfiguration, sourceQuestionNames),
						computePerformancePoint(challengeResult, challengeRanking, challengeConfiguration, sourceQuestionNames))
				.collect(Collectors.toList());
		challengePoint.setQuestions(Stream.concat(challengePoint.getQuestions().stream(), questions.stream())
				.sorted(Comparator.comparing(QuestionPoint::getName)).collect(Collectors.toList()));
		challengePoint.setTotal(challengePoint.getTotal() + sumQuestionPoint(questions));
	}

	private Optional<ChallengePoint> computeChallengePoint(ChallengeResult challengeResult, ChallengeRanking challengeRanking) {
		if (challengeRanking == null) {
			return Optional.empty();
		}
		var challengeConfiguration = challengeConfigurationService.getChallengeConfigurationByChallenge(challengeResult.getChallenge());
		if (challengeConfiguration == null) {
			return Optional.empty();
		}
		if (Boolean.TRUE.equals(challengeResult.getChecked())) {
			ChallengePoint challengePoint = new ChallengePoint(challengeResult.getChallenge(), 0l);
			var source = challengeResult.getResponseSources().stream().filter(s -> s instanceof ChallengeResponseSource)
					.findFirst().orElse(null);
			computeChallengePoint(challengePoint, challengeResult, challengeRanking, challengeConfiguration, source);
			return Optional.of(challengePoint);
		}
		return Optional.empty();
	}

	private TeamPoint computeTeamPointFromChallengeResult(ChallengeResult challengeResult, ChallengeRanking challengeRanking) {
		TeamPoint teamPoint = makeTeamPoint(challengeResult.getTeam());
		computeChallengePoint(challengeResult, challengeRanking).ifPresentOrElse(
				challengePoint -> teamPoint.getChallengePoints().put(challengeResult.getChallenge(), challengePoint),
				() -> teamPoint.getChallengePoints().remove(challengeResult.getChallenge()));
		computeTeamPointTotal(teamPoint);
		return save(teamPoint);
	}

	private void computeTeamPointTotal(TeamPoint teamPoint) {
		teamPoint
				.setTotal(teamPoint.getChallengePoints().values().stream().map(ChallengePoint::getTotal).reduce(0l, Long::sum));
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
