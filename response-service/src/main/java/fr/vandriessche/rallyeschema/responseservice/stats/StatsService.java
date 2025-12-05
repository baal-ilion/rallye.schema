package fr.vandriessche.rallyeschema.responseservice.stats;

import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.PerformanceResult;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageResultRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamInfoRepository;
import fr.vandriessche.rallyeschema.responseservice.stats.dto.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatsService {

    private final StageResultRepository stageResultRepository;
    private final StageParamRepository stageParamRepository;
    private final TeamInfoRepository teamInfoRepository;

    private static final DateTimeFormatter BUCKET_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public StatsService(StageResultRepository stageResultRepository,
                        StageParamRepository stageParamRepository,
                        TeamInfoRepository teamInfoRepository) {
        this.stageResultRepository = stageResultRepository;
        this.stageParamRepository = stageParamRepository;
        this.teamInfoRepository = teamInfoRepository;
    }

    public StatsResponseDto computeStats() {
        List<StageResult> results = stageResultRepository.findAll();
        // Après rallye : on ne considère que les participations terminées
        List<StageResult> finishedResults = results.stream()
                .filter(r -> r.getBegin() != null && r.getEnd() != null && r.getStage() != null && r.getTeam() != null)
                .collect(Collectors.toList());
        List<StageParam> stageParams = stageParamRepository.findAll();
        List<TeamInfo> teams = teamInfoRepository.findAll();

        Map<Integer, String> stageNameById = stageParams.stream()
                .collect(Collectors.toMap(StageParam::getStage, StageParam::getName));
        Map<Integer, String> groupIdByStage = stageParams.stream()
                .filter(p -> p.getGroup() != null)
                .collect(Collectors.toMap(StageParam::getStage, p -> p.getGroup().getId()));
        Map<String, String> groupNameById = stageParams.stream()
                .filter(p -> p.getGroup() != null)
                .collect(Collectors.toMap(p -> p.getGroup().getId(), p -> p.getGroup().getName(), (a, b) -> a));
        Map<Integer, TeamInfo> teamByNumber = teams.stream()
                .collect(Collectors.toMap(TeamInfo::getTeam, t -> t));

        StatsResponseDto response = new StatsResponseDto();
        response.setOverview(buildOverview(finishedResults, stageParams.size(), teams.size()));
        response.setStages(buildStageStats(finishedResults, stageNameById));
        response.setTeams(buildTeamStats(finishedResults, teamByNumber));
        response.setPopularity(buildPopularity(finishedResults, stageNameById));
        response.setGroupPopularity(buildGroupPopularity(finishedResults, groupIdByStage, groupNameById));
        response.setTimeline(buildTimeline(finishedResults));
        response.setQuestions(buildQuestionStats(finishedResults, stageNameById));
        response.setActivity(buildActivity(finishedResults));
        return response;
    }

    private StatsOverviewDto buildOverview(List<StageResult> results, int stageCount, int teamCount) {
        StatsOverviewDto dto = new StatsOverviewDto();
        dto.setTotalTeams(teamCount);
        dto.setTotalStages(stageCount);
        dto.setTotalParticipation(results.size());

        dto.setInProgress(0);
        long finished = results.stream().filter(r -> r.getBegin() != null && r.getEnd() != null).count();
        dto.setFinished(finished);
        long theoretical = (long) stageCount * (long) teamCount;
        dto.setNotStarted(Math.max(theoretical - results.size(), 0));

        double totalDuration = results.stream()
                .mapToDouble(this::durationMinutes)
                .sum();
        long finishedCount = results.size();
        dto.setTotalDurationMinutes(totalDuration);
        dto.setAverageDurationMinutes(finishedCount > 0 ? totalDuration / finishedCount : 0);
        return dto;
    }

    private List<StageStatDto> buildStageStats(List<StageResult> results, Map<Integer, String> stageNameById) {
        Map<Integer, List<StageResult>> byStage = results.stream()
                .collect(Collectors.groupingBy(StageResult::getStage));
        List<StageStatDto> stageStats = new ArrayList<>();
        for (Map.Entry<Integer, List<StageResult>> entry : byStage.entrySet()) {
            int stageId = entry.getKey();
            List<StageResult> stageResults = entry.getValue();
            StageStatDto dto = new StageStatDto();
            dto.setStage(stageId);
            dto.setName(stageNameById.getOrDefault(stageId, "Épreuve " + stageId));
            dto.setParticipants(stageResults.size());
            dto.setFinished(stageResults.size());
            dto.setInProgress(0);
            List<Double> durations = stageResults.stream()
                    .map(this::durationMinutes)
                    .filter(d -> d > 0)
                    .collect(Collectors.toList());
            double totalDuration = durations.stream().mapToDouble(d -> d).sum();
            long countFinished = durations.size();
            dto.setAverageDurationMinutes(countFinished > 0 ? totalDuration / countFinished : 0);
            dto.setMinDurationMinutes(durations.stream().mapToDouble(d -> d).min().orElse(0));
            dto.setMaxDurationMinutes(durations.stream().mapToDouble(d -> d).max().orElse(0));

            List<Double> scores = stageResults.stream()
                    .map(this::scorePercent)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            double totalScore = scores.stream().mapToDouble(Double::doubleValue).sum();
            int scoreCount = scores.size();
            dto.setAverageScorePercent(scoreCount > 0 ? totalScore / scoreCount : 0);
            dto.setMinScorePercent(scores.stream().mapToDouble(Double::doubleValue).min().orElse(0));
            dto.setMaxScorePercent(scores.stream().mapToDouble(Double::doubleValue).max().orElse(0));

            long totalAnswers = stageResults.stream()
                    .flatMap(r -> Optional.ofNullable(r.getResults()).orElse(Collections.emptyList()).stream())
                    .filter(res -> res.getResultValue() != null)
                    .count();
            long totalSuccess = stageResults.stream()
                    .flatMap(r -> Optional.ofNullable(r.getResults()).orElse(Collections.emptyList()).stream())
                    .filter(res -> Boolean.TRUE.equals(res.getResultValue()))
                    .count();
            dto.setTotalQuestionAnswers(totalAnswers);
            dto.setTotalQuestionSuccess(totalSuccess);

            List<Long> questionSuccessCounts = stageResults.stream()
                    .map(r -> {
                        long success = Optional.ofNullable(r.getResults()).orElse(Collections.emptyList()).stream()
                                .filter(res -> Boolean.TRUE.equals(res.getResultValue()))
                                .count();
                        return success;
                    })
                    .collect(Collectors.toList());
            long questionCount = questionSuccessCounts.size();
            if (questionCount > 0) {
                long minQ = questionSuccessCounts.stream().mapToLong(Long::longValue).min().orElse(0);
                long maxQ = questionSuccessCounts.stream().mapToLong(Long::longValue).max().orElse(0);
                double avgQ = questionSuccessCounts.stream().mapToLong(Long::longValue).average().orElse(0);
                dto.setMinQuestionSuccess(minQ);
                dto.setMaxQuestionSuccess(maxQ);
                dto.setAverageQuestionSuccess(avgQ);
            } else {
                dto.setMinQuestionSuccess(null);
                dto.setMaxQuestionSuccess(null);
                dto.setAverageQuestionSuccess(null);
            }

            List<Double> performances = stageResults.stream()
                    .flatMap(r -> Optional.ofNullable(r.getPerformances()).orElse(Collections.emptyList()).stream())
                    .map(PerformanceResult::getPerformanceValue)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            double totalPerf = performances.stream().mapToDouble(Double::doubleValue).sum();
            int perfCount = performances.size();
            dto.setAveragePerformanceValue(perfCount > 0 ? totalPerf / perfCount : null);
            dto.setMinPerformanceValue(perfCount > 0 ? performances.stream().mapToDouble(Double::doubleValue).min().orElse(0) : null);
            dto.setMaxPerformanceValue(perfCount > 0 ? performances.stream().mapToDouble(Double::doubleValue).max().orElse(0) : null);

            Map<String, Long> activityBuckets = new HashMap<>();
            stageResults.forEach(result -> {
                Instant begin = result.getBegin();
                Instant end = result.getEnd();
                if (begin == null || end == null) {
                    return;
                }
                Instant cursor = begin.truncatedTo(ChronoUnit.HOURS);
                Instant endBucket = end.truncatedTo(ChronoUnit.HOURS);
                while (!cursor.isAfter(endBucket)) {
                    String bucket = bucketKey(cursor);
                    activityBuckets.put(bucket, activityBuckets.getOrDefault(bucket, 0L) + 1);
                    cursor = cursor.plus(1, ChronoUnit.HOURS);
                }
            });
            activityBuckets.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .ifPresent(e -> {
                        dto.setPeakActivityBucket(e.getKey());
                        dto.setPeakActivityCount(e.getValue());
                    });
            stageStats.add(dto);
        }
        stageStats.sort(Comparator.comparingInt(StageStatDto::getStage));
        return stageStats;
    }

    private List<TeamStatDto> buildTeamStats(List<StageResult> results, Map<Integer, TeamInfo> teamByNumber) {
        Map<Integer, List<StageResult>> byTeam = results.stream()
                .collect(Collectors.groupingBy(StageResult::getTeam));
        List<TeamStatDto> teamStats = new ArrayList<>();
        for (Map.Entry<Integer, TeamInfo> entry : teamByNumber.entrySet()) {
            int teamNumber = entry.getKey();
            TeamInfo info = entry.getValue();
            List<StageResult> teamResults = byTeam.getOrDefault(teamNumber, Collections.emptyList());
            TeamStatDto dto = new TeamStatDto();
            dto.setTeam(teamNumber);
            dto.setName(info.getName());
            dto.setFinished(teamResults.size());
            dto.setInProgress(0);
            double totalDuration = teamResults.stream()
                    .mapToDouble(this::durationMinutes)
                    .sum();
            dto.setTotalDurationMinutes(totalDuration);
            teamStats.add(dto);
        }
        teamStats.sort(Comparator.comparingInt(TeamStatDto::getTeam));
        return teamStats;
    }

    private List<PopularityDto> buildPopularity(List<StageResult> results, Map<Integer, String> stageNameById) {
        Map<Integer, Long> counts = results.stream()
                .collect(Collectors.groupingBy(StageResult::getStage, Collectors.counting()));
        return counts.entrySet().stream()
                .sorted(Map.Entry.<Integer, Long>comparingByValue().reversed())
                .map(e -> {
                    PopularityDto dto = new PopularityDto();
                    dto.setStage(e.getKey());
                    dto.setName(stageNameById.getOrDefault(e.getKey(), "Épreuve " + e.getKey()));
                    dto.setParticipations(e.getValue());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<GroupPopularityDto> buildGroupPopularity(List<StageResult> results,
                                                          Map<Integer, String> groupIdByStage,
                                                          Map<String, String> groupNameById) {
        Map<String, Long> counts = new HashMap<>();
        results.forEach(r -> {
            String groupId = groupIdByStage.get(r.getStage());
            if (groupId != null) {
                counts.put(groupId, counts.getOrDefault(groupId, 0L) + 1);
            }
        });

        return counts.entrySet().stream()
                .map(e -> {
                    GroupPopularityDto dto = new GroupPopularityDto();
                    dto.setGroupId(e.getKey());
                    dto.setName(groupNameById.getOrDefault(e.getKey(), "Groupe"));
                    dto.setParticipations(e.getValue());
                    return dto;
                })
                .sorted(Comparator.comparing(GroupPopularityDto::getName))
                .collect(Collectors.toList());
    }

    private List<StageQuestionsStatsDto> buildQuestionStats(List<StageResult> results, Map<Integer, String> stageNameById) {
        Map<Integer, List<StageResult>> byStage = results.stream()
                .collect(Collectors.groupingBy(StageResult::getStage));
        List<StageQuestionsStatsDto> stats = new ArrayList<>();
        for (Map.Entry<Integer, List<StageResult>> entry : byStage.entrySet()) {
            int stageId = entry.getKey();
            List<StageResult> stageResults = entry.getValue();

            Map<String, List<Boolean>> byQuestion = new HashMap<>();
            stageResults.forEach(r -> {
                if (r.getResults() != null) {
                    r.getResults().forEach(res -> {
                        if (res.getName() != null && res.getResultValue() != null) {
                            byQuestion.computeIfAbsent(res.getName(), k -> new ArrayList<>()).add(res.getResultValue());
                        }
                    });
                }
            });

            if (byQuestion.isEmpty()) {
                continue;
            }

            List<StageQuestionRateDto> questions = byQuestion.entrySet().stream()
                    .map(e -> {
                        List<Boolean> vals = e.getValue();
                        long total = vals.size();
                        long success = vals.stream().filter(Boolean::booleanValue).count();
                        StageQuestionRateDto dto = new StageQuestionRateDto();
                        dto.setQuestion(e.getKey());
                        dto.setTotalAnswers(total);
                        dto.setSuccessCount(success);
                        dto.setSuccessRate(total > 0 ? (double) success / total : 0);
                        return dto;
                    })
                    .sorted(Comparator.comparing(StageQuestionRateDto::getQuestion))
                    .collect(Collectors.toList());

            StageQuestionsStatsDto stageDto = new StageQuestionsStatsDto();
            stageDto.setStage(stageId);
            stageDto.setName(stageNameById.getOrDefault(stageId, "Épreuve " + stageId));
            stageDto.setQuestions(questions);
            stats.add(stageDto);
        }

        stats.sort(Comparator.comparingInt(StageQuestionsStatsDto::getStage));
        return stats;
    }

    private List<TimelinePointDto> buildTimeline(List<StageResult> results) {
        Map<String, List<Double>> bucketDurations = new HashMap<>();
        results.forEach(result -> {
            if (result.getBegin() != null && result.getEnd() != null) {
                String bucket = bucketKey(result.getEnd());
                bucketDurations.computeIfAbsent(bucket, b -> new ArrayList<>())
                        .add(durationMinutes(result));
            }
        });
        List<TimelinePointDto> list = new ArrayList<>();
        bucketDurations.forEach((bucket, durations) -> {
            TimelinePointDto dto = new TimelinePointDto();
            dto.setBucket(bucket);
            dto.setStarts(0);
            dto.setEnds(durations.size());
            double avg = durations.stream().mapToDouble(d -> d).average().orElse(0);
            dto.setAverageDurationMinutes(avg);
            list.add(dto);
        });
        list.sort(Comparator.comparing(TimelinePointDto::getBucket));
        return list;
    }

    private List<ActivityPointDto> buildActivity(List<StageResult> results) {
        Map<String, Long> buckets = new HashMap<>();
        results.forEach(result -> {
            Instant begin = result.getBegin();
            Instant end = result.getEnd();
            if (begin == null || end == null) {
                return;
            }
            Instant cursor = begin.truncatedTo(ChronoUnit.HOURS);
            Instant endBucket = end.truncatedTo(ChronoUnit.HOURS);
            while (!cursor.isAfter(endBucket)) {
                String bucket = bucketKey(cursor);
                buckets.put(bucket, buckets.getOrDefault(bucket, 0L) + 1);
                cursor = cursor.plus(1, ChronoUnit.HOURS);
            }
        });
        return buckets.entrySet().stream()
                .map(e -> {
                    ActivityPointDto dto = new ActivityPointDto();
                    dto.setBucket(e.getKey());
                    dto.setActive(e.getValue());
                    return dto;
                })
                .sorted(Comparator.comparing(ActivityPointDto::getBucket))
                .collect(Collectors.toList());
    }

    private double durationMinutes(StageResult result) {
        Instant begin = result.getBegin();
        Instant end = result.getEnd();
        if (begin == null || end == null) {
            return 0;
        }
        return ChronoUnit.MINUTES.between(
                begin.atZone(ZoneId.systemDefault()).toLocalDateTime(),
                end.atZone(ZoneId.systemDefault()).toLocalDateTime());
    }

    private String bucketKey(Instant instant) {
        return instant.atZone(ZoneId.systemDefault())
                .truncatedTo(ChronoUnit.HOURS)
                .format(BUCKET_FORMATTER);
    }

    private Double scorePercent(StageResult result) {
        if (result.getResults() == null || result.getResults().isEmpty()) {
            return null;
        }
        long total = result.getResults().stream()
                .filter(r -> r.getResultValue() != null)
                .count();
        if (total == 0) {
            return null;
        }
        long success = result.getResults().stream()
                .filter(r -> Boolean.TRUE.equals(r.getResultValue()))
                .count();
        return (double) success * 100d / (double) total;
    }
}
