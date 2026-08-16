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
import java.time.ZonedDateTime;
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
    private static final DateTimeFormatter HEATMAP_LABEL_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter MULTI_DAY_HEATMAP_LABEL_FORMATTER = DateTimeFormatter.ofPattern("dd/MM HH:mm");
    private static final long HEATMAP_BASE_INTERVAL_MINUTES = 15;
    private static final long HEATMAP_MAX_BUCKETS = 96;
    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Europe/Paris");
    private static final String UNGROUPED_KEY = "__ungrouped__";
    private static final String UNGROUPED_LABEL = "Sans groupe";

    public StatsService(StageResultRepository stageResultRepository,
                        StageParamRepository stageParamRepository,
                        TeamInfoRepository teamInfoRepository) {
        this.stageResultRepository = stageResultRepository;
        this.stageParamRepository = stageParamRepository;
        this.teamInfoRepository = teamInfoRepository;
    }

    public StatsResponseDto computeStats() {
        List<StageResult> results = stageResultRepository.findAll();
        // Apres rallye : on ne considere que les participations terminees
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
        Map<Integer, StageParam> stageParamByStage = stageParams.stream()
                .collect(Collectors.toMap(StageParam::getStage, p -> p));
        Map<Integer, TeamInfo> teamByNumber = teams.stream()
                .collect(Collectors.toMap(TeamInfo::getTeam, t -> t));

        StatsResponseDto response = new StatsResponseDto();
        response.setOverview(buildOverview(finishedResults, stageParams.size(), teams.size()));
        List<StageStatDto> stageStats = buildStageStats(finishedResults, stageNameById, stageParamByStage, groupIdByStage, groupNameById);
        response.setStages(stageStats);
        response.setStageGroups(buildStageGroupStats(stageStats));
        response.setTeams(buildTeamStats(finishedResults, teamByNumber));
        response.setPopularity(buildPopularity(finishedResults, stageNameById));
        response.setGroupPopularity(buildGroupPopularity(finishedResults, groupIdByStage, groupNameById));
        response.setTimeline(buildTimeline(finishedResults));
        StageHeatmapResult heatmapResult = buildStageHeatmaps(finishedResults, stageNameById);
        response.setStageHeatmap(heatmapResult.getHeatmaps());
        response.setStageHeatmapTimeline(mapIntervalsToBuckets(heatmapResult.getIntervals()));
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

    private List<StageStatDto> buildStageStats(List<StageResult> results,
                                               Map<Integer, String> stageNameById,
                                               Map<Integer, StageParam> stageParamByStage,
                                               Map<Integer, String> groupIdByStage,
                                               Map<String, String> groupNameById) {
        Map<Integer, List<StageResult>> byStage = results.stream()
                .collect(Collectors.groupingBy(StageResult::getStage));
        List<StageStatDto> stageStats = new ArrayList<>();
        for (Map.Entry<Integer, List<StageResult>> entry : byStage.entrySet()) {
            int stageId = entry.getKey();
            List<StageResult> stageResults = entry.getValue();
            StageStatDto dto = new StageStatDto();
            dto.setStage(stageId);
            dto.setName(stageNameById.getOrDefault(stageId, "Epreuve " + stageId));
            String groupId = groupIdByStage.get(stageId);
            dto.setGroupId(groupId);
            dto.setGroupName(groupId != null ? groupNameById.get(groupId) : null);
            StageParam stageParam = stageParamByStage.get(stageId);
            int questionCount = Optional.ofNullable(stageParam)
                    .map(StageParam::getQuestionParams)
                    .map(Map::size)
                    .orElse(0);
            dto.setQuestionCount(questionCount);
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
            long questionSuccessCount = questionSuccessCounts.size();
            if (questionSuccessCount > 0) {
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

    private List<StageGroupStatsDto> buildStageGroupStats(List<StageStatDto> stageStats) {
        Map<String, StageGroupStatsDto> grouped = new LinkedHashMap<>();
        for (StageStatDto stage : stageStats) {
            String groupKey = stage.getGroupId() != null ? stage.getGroupId() : UNGROUPED_KEY;
            StageGroupStatsDto group = grouped.computeIfAbsent(groupKey, key -> {
                StageGroupStatsDto dto = new StageGroupStatsDto();
                dto.setGroupId(stage.getGroupId());
                dto.setName(stage.getGroupName() != null ? stage.getGroupName() : UNGROUPED_LABEL);
                dto.setStages(new ArrayList<>());
                return dto;
            });
            group.getStages().add(stage);
        }
        return new ArrayList<>(grouped.values());
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
                    dto.setName(stageNameById.getOrDefault(e.getKey(), "Epreuve " + e.getKey()));
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
            stageDto.setName(stageNameById.getOrDefault(stageId, "Epreuve " + stageId));
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

  private StageHeatmapResult buildStageHeatmaps(List<StageResult> results, Map<Integer, String> stageNameById) {
    List<StageResult> validResults = results.stream()
            .filter(r -> r.getBegin() != null && r.getEnd() != null && stageNameById.containsKey(r.getStage()))
            .collect(Collectors.toList());
    if (validResults.isEmpty()) {
      return new StageHeatmapResult(Collections.emptyList(), Collections.emptyList());
    }
    ZonedDateTime globalStart = validResults.stream()
            .map(r -> r.getBegin().atZone(DISPLAY_ZONE))
            .min(Comparator.naturalOrder())
            .orElse(null);
    ZonedDateTime globalEnd = validResults.stream()
            .map(r -> r.getEnd().atZone(DISPLAY_ZONE))
            .max(Comparator.naturalOrder())
            .orElse(null);
    if (globalStart == null || globalEnd == null || !globalStart.isBefore(globalEnd)) {
      return new StageHeatmapResult(Collections.emptyList(), Collections.emptyList());
    }
    List<HeatmapInterval> intervals = buildHeatmapIntervals(globalStart, globalEnd);
    if (intervals.isEmpty()) {
      return new StageHeatmapResult(Collections.emptyList(), Collections.emptyList());
    }
    Map<Integer, List<StageResult>> byStage = validResults.stream()
            .collect(Collectors.groupingBy(StageResult::getStage));
    List<StageHeatmapDto> heatmaps = new ArrayList<>();
    for (Map.Entry<Integer, List<StageResult>> entry : byStage.entrySet()) {
      List<StageResult> stageResults = entry.getValue();
      List<StageHeatmapBucketDto> buckets = intervals.stream()
              .map(interval -> toBucket(interval, countActiveResults(stageResults, interval.getStartInstant(), interval.getEndInstant())))
              .collect(Collectors.toList());
      StageHeatmapDto dto = new StageHeatmapDto();
      dto.setStage(entry.getKey());
      dto.setName(stageNameById.getOrDefault(entry.getKey(), "Epreuve " + entry.getKey()));
      dto.setBuckets(buckets);
      heatmaps.add(dto);
    }
    heatmaps.sort(Comparator.comparingInt(StageHeatmapDto::getStage));
    return new StageHeatmapResult(heatmaps, intervals);
  }

  private List<HeatmapInterval> buildHeatmapIntervals(ZonedDateTime start, ZonedDateTime end) {
    List<HeatmapInterval> intervals = new ArrayList<>();
    long totalMinutes = Math.max(1, ChronoUnit.MINUTES.between(start, end));
    long intervalMinutes = HEATMAP_BASE_INTERVAL_MINUTES;
    long baseIntervalCount = (totalMinutes + HEATMAP_BASE_INTERVAL_MINUTES - 1) / HEATMAP_BASE_INTERVAL_MINUTES;
    if (baseIntervalCount > HEATMAP_MAX_BUCKETS) {
      long requiredMinutes = (totalMinutes + HEATMAP_MAX_BUCKETS - 1) / HEATMAP_MAX_BUCKETS;
      intervalMinutes = ((requiredMinutes + HEATMAP_BASE_INTERVAL_MINUTES - 1) / HEATMAP_BASE_INTERVAL_MINUTES)
              * HEATMAP_BASE_INTERVAL_MINUTES;
    }
    DateTimeFormatter labelFormatter = start.toLocalDate().equals(end.toLocalDate())
            ? HEATMAP_LABEL_FORMATTER
            : MULTI_DAY_HEATMAP_LABEL_FORMATTER;
    ZonedDateTime cursor = start;
    while (cursor.isBefore(end)) {
      ZonedDateTime bucketEnd = cursor.plus(intervalMinutes, ChronoUnit.MINUTES);
      if (bucketEnd.isAfter(end)) {
        bucketEnd = end;
      }
      String label = cursor.format(labelFormatter);
      intervals.add(new HeatmapInterval(cursor, bucketEnd, label));
      cursor = bucketEnd;
    }
    return intervals;
  }

  private StageHeatmapBucketDto toBucket(HeatmapInterval interval, long active) {
    StageHeatmapBucketDto bucket = new StageHeatmapBucketDto();
    bucket.setStart(interval.getStartInstant().toString());
    bucket.setEnd(interval.getEndInstant().toString());
    bucket.setLabel(interval.getLabel());
    bucket.setActive(active);
    return bucket;
  }

  private List<StageHeatmapBucketDto> mapIntervalsToBuckets(List<HeatmapInterval> intervals) {
    return intervals.stream()
            .map(interval -> toBucket(interval, 0))
            .collect(Collectors.toList());
  }

  private static class StageHeatmapResult {
    private final List<StageHeatmapDto> heatmaps;
    private final List<HeatmapInterval> intervals;

    StageHeatmapResult(List<StageHeatmapDto> heatmaps, List<HeatmapInterval> intervals) {
      this.heatmaps = heatmaps;
      this.intervals = intervals;
    }

    List<StageHeatmapDto> getHeatmaps() {
      return heatmaps;
    }

    List<HeatmapInterval> getIntervals() {
      return intervals;
    }
  }

  private static class HeatmapInterval {
    private final ZonedDateTime start;
    private final ZonedDateTime end;
    private final String label;

    HeatmapInterval(ZonedDateTime start, ZonedDateTime end, String label) {
      this.start = start;
      this.end = end;
      this.label = label;
    }

    @SuppressWarnings("unused")
    ZonedDateTime getStart() {
      return start;
    }

    @SuppressWarnings("unused")
    ZonedDateTime getEnd() {
      return end;
    }

    Instant getStartInstant() {
      return start.toInstant();
    }

    Instant getEndInstant() {
      return end.toInstant();
    }

    String getLabel() {
      return label;
    }
  }
  
  private long countActiveResults(List<StageResult> results, Instant start, Instant end) {
    return results.stream()
            .filter(r -> r.getBegin().isBefore(end) && r.getEnd().isAfter(start))
            .count();
  }

  private List<ActivityPointDto> buildActivity(List<StageResult> results) {
        Map<String, Long> buckets = new HashMap<>();
        results.forEach(result -> {
            Instant begin = result.getBegin();
            Instant end = result.getEnd();
            if (begin == null || end == null) {
                return;
            }
            ZonedDateTime cursor = begin.atZone(DISPLAY_ZONE).truncatedTo(ChronoUnit.HOURS);
            ZonedDateTime endBucket = end.atZone(DISPLAY_ZONE).truncatedTo(ChronoUnit.HOURS);
            while (!cursor.isAfter(endBucket)) {
                String bucket = cursor.format(BUCKET_FORMATTER);
                buckets.put(bucket, buckets.getOrDefault(bucket, 0L) + 1);
                cursor = cursor.plusHours(1);
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
                begin.atZone(DISPLAY_ZONE).toLocalDateTime(),
                end.atZone(DISPLAY_ZONE).toLocalDateTime());
    }

    private String bucketKey(Instant instant) {
        return instant.atZone(DISPLAY_ZONE)
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
