package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.formscannerservice.entities.StagePoint;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResult;
import fr.vandriessche.rallyeschema.formscannerservice.entities.TeamPoint;
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

	public TeamPoint computeTeamPoint(@NonNull String stageResultId) {
		var stageResult = stageResultService.getStageResult(stageResultId);
		TeamPoint teamPoint = makeTeamPoint(stageResult.getTeam());
		teamPoint.getStagePoints().put(stageResult.getStage(), computeStagePoint(stageResult));
		computeTeamPointTotal(teamPoint);
		teamPoint = teamPointRepository.save(teamPoint);
		return teamPoint;
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

	private void computeTeamPointTotal(TeamPoint teamPoint) {
		teamPoint
				.setTotal(teamPoint.getStagePoints().values().stream().map(StagePoint::getTotal).reduce(0l, Long::sum));
	}

	private TeamPoint makeTeamPoint(Integer team) {
		return teamPointRepository.findByTeam(team).orElse(new TeamPoint(team));
	}

}
