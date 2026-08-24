package fr.vandriessche.rallyeschema.coreservice.statistics;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import fr.vandriessche.rallyeschema.coreservice.entities.Team;
import fr.vandriessche.rallyeschema.coreservice.entities.PerformanceResult;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeResultRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamRepository;
import fr.vandriessche.rallyeschema.coreservice.statistics.dto.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatisticsService {

    private final ChallengeResultRepository challengeResultRepository;
    private final ChallengeConfigurationRepository challengeConfigurationRepository;
    private final TeamRepository teamRepository;

    private static final DateTimeFormatter BUCKET_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter HEATMAP_LABEL_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter MULTI_DAY_HEATMAP_LABEL_FORMATTER = DateTimeFormatter.ofPattern("dd/MM HH:mm");
    private static final long HEATMAP_BASE_INTERVAL_MINUTES = 15;
    private static final long HEATMAP_MAX_BUCKETS = 96;
    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Europe/Paris");
    private static final String UNGROUPED_KEY = "__ungrouped__";
    private static final String UNGROUPED_LABEL = "Sans groupe";

    public StatisticsService(ChallengeResultRepository challengeResultRepository,
                        ChallengeConfigurationRepository challengeConfigurationRepository,
                        TeamRepository teamRepository) {
        this.challengeResultRepository = challengeResultRepository;
        this.challengeConfigurationRepository = challengeConfigurationRepository;
        this.teamRepository = teamRepository;
    }

    public StatisticsResponseDto computeStats() {
        List<ChallengeResult> results = challengeResultRepository.findAll();
        // Apres rallye : on ne considere que les participations terminees
        List<ChallengeResult> finishedResults = results.stream()
                .filter(r -> r.getBegin() != null && r.getEnd() != null && r.getChallenge() != null && r.getTeam() != null)
                .collect(Collectors.toList());
        List<ChallengeConfiguration> challengeConfigurations = challengeConfigurationRepository.findAll();
        List<Team> teams = teamRepository.findAll();

        Map<Integer, String> challengeNameById = challengeConfigurations.stream()
                .collect(Collectors.toMap(ChallengeConfiguration::getChallenge, ChallengeConfiguration::getName));
        Map<Integer, String> groupIdByChallenge = challengeConfigurations.stream()
                .filter(p -> p.getGroup() != null)
                .collect(Collectors.toMap(ChallengeConfiguration::getChallenge, p -> p.getGroup().getId()));
        Map<String, String> groupNameById = challengeConfigurations.stream()
                .filter(p -> p.getGroup() != null)
                .collect(Collectors.toMap(p -> p.getGroup().getId(), p -> p.getGroup().getName(), (a, b) -> a));
        Map<Integer, ChallengeConfiguration> challengeConfigurationByChallenge = challengeConfigurations.stream()
                .collect(Collectors.toMap(ChallengeConfiguration::getChallenge, p -> p));
        Map<Integer, Team> teamByNumber = teams.stream()
                .collect(Collectors.toMap(Team::getTeam, t -> t));

        StatisticsResponseDto response = new StatisticsResponseDto();
        response.setOverview(buildOverview(finishedResults, challengeConfigurations.size(), teams.size()));
        List<ChallengeStatisticsDto> challengeStats = buildChallengeStats(finishedResults, challengeNameById, challengeConfigurationByChallenge, groupIdByChallenge, groupNameById);
        response.setChallenges(challengeStats);
        response.setChallengeGroups(buildChallengeGroupStats(challengeStats));
        response.setTeams(buildTeamStats(finishedResults, teamByNumber));
        response.setPopularity(buildPopularity(finishedResults, challengeNameById));
        response.setGroupPopularity(buildGroupPopularity(finishedResults, groupIdByChallenge, groupNameById));
        response.setTimeline(buildTimeline(finishedResults));
        ChallengeHeatmapResult heatmapResult = buildChallengeHeatmaps(finishedResults, challengeNameById);
        response.setChallengeHeatmap(heatmapResult.getHeatmaps());
        response.setChallengeHeatmapTimeline(mapIntervalsToBuckets(heatmapResult.getIntervals()));
        response.setQuestions(buildQuestionStats(finishedResults, challengeNameById));
        response.setActivity(buildActivity(finishedResults));
        return response;
    }

    private StatisticsOverviewDto buildOverview(List<ChallengeResult> results, int challengeCount, int teamCount) {
        StatisticsOverviewDto dto = new StatisticsOverviewDto();
        dto.setTotalTeams(teamCount);
        dto.setTotalChallenges(challengeCount);
        dto.setTotalParticipation(results.size());

        dto.setInProgress(0);
        long finished = results.stream().filter(r -> r.getBegin() != null && r.getEnd() != null).count();
        dto.setFinished(finished);
        long theoretical = (long) challengeCount * (long) teamCount;
        dto.setNotStarted(Math.max(theoretical - results.size(), 0));

        double totalDuration = results.stream()
                .mapToDouble(this::durationMinutes)
                .sum();
        long finishedCount = results.size();
        dto.setTotalDurationMinutes(totalDuration);
        dto.setAverageDurationMinutes(finishedCount > 0 ? totalDuration / finishedCount : 0);
        return dto;
    }

    private List<ChallengeStatisticsDto> buildChallengeStats(List<ChallengeResult> results,
                                               Map<Integer, String> challengeNameById,
                                               Map<Integer, ChallengeConfiguration> challengeConfigurationByChallenge,
                                               Map<Integer, String> groupIdByChallenge,
                                               Map<String, String> groupNameById) {
        Map<Integer, List<ChallengeResult>> byChallenge = results.stream()
                .collect(Collectors.groupingBy(ChallengeResult::getChallenge));
        List<ChallengeStatisticsDto> challengeStats = new ArrayList<>();
        for (Map.Entry<Integer, List<ChallengeResult>> entry : byChallenge.entrySet()) {
            int challengeId = entry.getKey();
            List<ChallengeResult> challengeResults = entry.getValue();
            ChallengeStatisticsDto dto = new ChallengeStatisticsDto();
            dto.setChallenge(challengeId);
            dto.setName(challengeNameById.getOrDefault(challengeId, "Épreuve " + challengeId));
            String groupId = groupIdByChallenge.get(challengeId);
            dto.setGroupId(groupId);
            dto.setGroupName(groupId != null ? groupNameById.get(groupId) : null);
            ChallengeConfiguration challengeConfiguration = challengeConfigurationByChallenge.get(challengeId);
            int questionCount = Optional.ofNullable(challengeConfiguration)
                    .map(ChallengeConfiguration::getQuestionDefinitions)
                    .map(Map::size)
                    .orElse(0);
            dto.setQuestionCount(questionCount);
            dto.setParticipants(challengeResults.size());
            dto.setFinished(challengeResults.size());
            dto.setInProgress(0);
            List<Double> durations = challengeResults.stream()
                    .map(this::durationMinutes)
                    .filter(d -> d > 0)
                    .collect(Collectors.toList());
            double totalDuration = durations.stream().mapToDouble(d -> d).sum();
            long countFinished = durations.size();
            dto.setAverageDurationMinutes(countFinished > 0 ? totalDuration / countFinished : 0);
            dto.setMinDurationMinutes(durations.stream().mapToDouble(d -> d).min().orElse(0));
            dto.setMaxDurationMinutes(durations.stream().mapToDouble(d -> d).max().orElse(0));

            List<Double> scores = challengeResults.stream()
                    .map(this::scorePercent)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            double totalScore = scores.stream().mapToDouble(Double::doubleValue).sum();
            int scoreCount = scores.size();
            dto.setAverageScorePercent(scoreCount > 0 ? totalScore / scoreCount : 0);
            dto.setMinScorePercent(scores.stream().mapToDouble(Double::doubleValue).min().orElse(0));
            dto.setMaxScorePercent(scores.stream().mapToDouble(Double::doubleValue).max().orElse(0));

            long totalAnswers = challengeResults.stream()
                    .flatMap(r -> Optional.ofNullable(r.getResults()).orElse(Collections.emptyList()).stream())
                    .filter(res -> res.getResultValue() != null)
                    .count();
            long totalSuccess = challengeResults.stream()
                    .flatMap(r -> Optional.ofNullable(r.getResults()).orElse(Collections.emptyList()).stream())
                    .filter(res -> Boolean.TRUE.equals(res.getResultValue()))
                    .count();
            dto.setTotalQuestionAnswers(totalAnswers);
            dto.setTotalQuestionSuccess(totalSuccess);

            List<Long> questionSuccessCounts = challengeResults.stream()
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

            List<Double> performances = challengeResults.stream()
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
            challengeResults.forEach(result -> {
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
            challengeStats.add(dto);
        }
        challengeStats.sort(Comparator.comparingInt(ChallengeStatisticsDto::getChallenge));
        return challengeStats;
    }

    private List<ChallengeGroupStatisticsDto> buildChallengeGroupStats(List<ChallengeStatisticsDto> challengeStats) {
        Map<String, ChallengeGroupStatisticsDto> grouped = new LinkedHashMap<>();
        for (ChallengeStatisticsDto challenge : challengeStats) {
            String groupKey = challenge.getGroupId() != null ? challenge.getGroupId() : UNGROUPED_KEY;
            ChallengeGroupStatisticsDto group = grouped.computeIfAbsent(groupKey, key -> {
                ChallengeGroupStatisticsDto dto = new ChallengeGroupStatisticsDto();
                dto.setGroupId(challenge.getGroupId());
                dto.setName(challenge.getGroupName() != null ? challenge.getGroupName() : UNGROUPED_LABEL);
                dto.setChallenges(new ArrayList<>());
                return dto;
            });
            group.getChallenges().add(challenge);
        }
        return new ArrayList<>(grouped.values());
    }

    private List<TeamStatisticsDto> buildTeamStats(List<ChallengeResult> results, Map<Integer, Team> teamByNumber) {
        Map<Integer, List<ChallengeResult>> byTeam = results.stream()
                .collect(Collectors.groupingBy(ChallengeResult::getTeam));
        List<TeamStatisticsDto> teamStats = new ArrayList<>();
        for (Map.Entry<Integer, Team> entry : teamByNumber.entrySet()) {
            int teamNumber = entry.getKey();
            Team team = entry.getValue();
            List<ChallengeResult> teamResults = byTeam.getOrDefault(teamNumber, Collections.emptyList());
            TeamStatisticsDto dto = new TeamStatisticsDto();
            dto.setTeam(teamNumber);
            dto.setName(team.getName());
            dto.setFinished(teamResults.size());
            dto.setInProgress(0);
            double totalDuration = teamResults.stream()
                    .mapToDouble(this::durationMinutes)
                    .sum();
            dto.setTotalDurationMinutes(totalDuration);
            teamStats.add(dto);
        }
        teamStats.sort(Comparator.comparingInt(TeamStatisticsDto::getTeam));
        return teamStats;
    }

    private List<PopularityDto> buildPopularity(List<ChallengeResult> results, Map<Integer, String> challengeNameById) {
        Map<Integer, Long> counts = results.stream()
                .collect(Collectors.groupingBy(ChallengeResult::getChallenge, Collectors.counting()));
        return counts.entrySet().stream()
                .sorted(Map.Entry.<Integer, Long>comparingByValue().reversed())
                .map(e -> {
                    PopularityDto dto = new PopularityDto();
                    dto.setChallenge(e.getKey());
                    dto.setName(challengeNameById.getOrDefault(e.getKey(), "Épreuve " + e.getKey()));
                    dto.setParticipations(e.getValue());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<GroupPopularityDto> buildGroupPopularity(List<ChallengeResult> results,
                                                          Map<Integer, String> groupIdByChallenge,
                                                          Map<String, String> groupNameById) {
        Map<String, Long> counts = new HashMap<>();
        results.forEach(r -> {
            String groupId = groupIdByChallenge.get(r.getChallenge());
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

    private List<ChallengeQuestionStatisticsDto> buildQuestionStats(List<ChallengeResult> results, Map<Integer, String> challengeNameById) {
        Map<Integer, List<ChallengeResult>> byChallenge = results.stream()
                .collect(Collectors.groupingBy(ChallengeResult::getChallenge));
        List<ChallengeQuestionStatisticsDto> statistics = new ArrayList<>();
        for (Map.Entry<Integer, List<ChallengeResult>> entry : byChallenge.entrySet()) {
            int challengeId = entry.getKey();
            List<ChallengeResult> challengeResults = entry.getValue();

            Map<String, List<Boolean>> byQuestion = new HashMap<>();
            challengeResults.forEach(r -> {
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

            List<ChallengeQuestionRateDto> questions = byQuestion.entrySet().stream()
                    .map(e -> {
                        List<Boolean> vals = e.getValue();
                        long total = vals.size();
                        long success = vals.stream().filter(Boolean::booleanValue).count();
                        ChallengeQuestionRateDto dto = new ChallengeQuestionRateDto();
                        dto.setQuestion(e.getKey());
                        dto.setTotalAnswers(total);
                        dto.setSuccessCount(success);
                        dto.setSuccessRate(total > 0 ? (double) success / total : 0);
                        return dto;
                    })
                    .sorted(Comparator.comparing(ChallengeQuestionRateDto::getQuestion))
                    .collect(Collectors.toList());

            ChallengeQuestionStatisticsDto challengeDto = new ChallengeQuestionStatisticsDto();
            challengeDto.setChallenge(challengeId);
            challengeDto.setName(challengeNameById.getOrDefault(challengeId, "Épreuve " + challengeId));
            challengeDto.setQuestions(questions);
            statistics.add(challengeDto);
        }

        statistics.sort(Comparator.comparingInt(ChallengeQuestionStatisticsDto::getChallenge));
        return statistics;
    }

    private List<TimelinePointDto> buildTimeline(List<ChallengeResult> results) {
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

  private ChallengeHeatmapResult buildChallengeHeatmaps(List<ChallengeResult> results, Map<Integer, String> challengeNameById) {
    List<ChallengeResult> validResults = results.stream()
            .filter(r -> r.getBegin() != null && r.getEnd() != null && challengeNameById.containsKey(r.getChallenge()))
            .collect(Collectors.toList());
    if (validResults.isEmpty()) {
      return new ChallengeHeatmapResult(Collections.emptyList(), Collections.emptyList());
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
      return new ChallengeHeatmapResult(Collections.emptyList(), Collections.emptyList());
    }
    List<HeatmapInterval> intervals = buildHeatmapIntervals(globalStart, globalEnd);
    if (intervals.isEmpty()) {
      return new ChallengeHeatmapResult(Collections.emptyList(), Collections.emptyList());
    }
    Map<Integer, List<ChallengeResult>> byChallenge = validResults.stream()
            .collect(Collectors.groupingBy(ChallengeResult::getChallenge));
    List<ChallengeHeatmapDto> heatmaps = new ArrayList<>();
    for (Map.Entry<Integer, List<ChallengeResult>> entry : byChallenge.entrySet()) {
      List<ChallengeResult> challengeResults = entry.getValue();
      List<ChallengeHeatmapBucketDto> buckets = intervals.stream()
              .map(interval -> toBucket(interval, countActiveResults(challengeResults, interval.getStartInstant(), interval.getEndInstant())))
              .collect(Collectors.toList());
      ChallengeHeatmapDto dto = new ChallengeHeatmapDto();
      dto.setChallenge(entry.getKey());
      dto.setName(challengeNameById.getOrDefault(entry.getKey(), "Épreuve " + entry.getKey()));
      dto.setBuckets(buckets);
      heatmaps.add(dto);
    }
    heatmaps.sort(Comparator.comparingInt(ChallengeHeatmapDto::getChallenge));
    return new ChallengeHeatmapResult(heatmaps, intervals);
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

  private ChallengeHeatmapBucketDto toBucket(HeatmapInterval interval, long active) {
    ChallengeHeatmapBucketDto bucket = new ChallengeHeatmapBucketDto();
    bucket.setStart(interval.getStartInstant().toString());
    bucket.setEnd(interval.getEndInstant().toString());
    bucket.setLabel(interval.getLabel());
    bucket.setActive(active);
    return bucket;
  }

  private List<ChallengeHeatmapBucketDto> mapIntervalsToBuckets(List<HeatmapInterval> intervals) {
    return intervals.stream()
            .map(interval -> toBucket(interval, 0))
            .collect(Collectors.toList());
  }

  private static class ChallengeHeatmapResult {
    private final List<ChallengeHeatmapDto> heatmaps;
    private final List<HeatmapInterval> intervals;

    ChallengeHeatmapResult(List<ChallengeHeatmapDto> heatmaps, List<HeatmapInterval> intervals) {
      this.heatmaps = heatmaps;
      this.intervals = intervals;
    }

    List<ChallengeHeatmapDto> getHeatmaps() {
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
  
  private long countActiveResults(List<ChallengeResult> results, Instant start, Instant end) {
    return results.stream()
            .filter(r -> r.getBegin().isBefore(end) && r.getEnd().isAfter(start))
            .count();
  }

  private List<ActivityPointDto> buildActivity(List<ChallengeResult> results) {
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

    private double durationMinutes(ChallengeResult result) {
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

    private Double scorePercent(ChallengeResult result) {
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
