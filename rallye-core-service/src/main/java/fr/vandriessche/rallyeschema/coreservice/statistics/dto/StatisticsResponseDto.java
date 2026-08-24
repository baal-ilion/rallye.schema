package fr.vandriessche.rallyeschema.coreservice.statistics.dto;

import java.util.List;

public class StatisticsResponseDto {
    private StatisticsOverviewDto overview;
    private List<ChallengeStatisticsDto> challenges;
    private List<TeamStatisticsDto> teams;
    private List<PopularityDto> popularity;
    private List<TimelinePointDto> timeline;
    private List<ChallengeQuestionStatisticsDto> questions;
    private List<ActivityPointDto> activity;
    private List<ChallengeHeatmapDto> challengeHeatmap;
    private List<ChallengeHeatmapBucketDto> challengeHeatmapTimeline;
    private List<GroupPopularityDto> groupPopularity;
    private List<ChallengeGroupStatisticsDto> challengeGroups;

    public StatisticsOverviewDto getOverview() {
        return overview;
    }

    public void setOverview(StatisticsOverviewDto overview) {
        this.overview = overview;
    }

    public List<ChallengeStatisticsDto> getChallenges() {
        return challenges;
    }

    public void setChallenges(List<ChallengeStatisticsDto> challenges) {
        this.challenges = challenges;
    }

    public List<TeamStatisticsDto> getTeams() {
        return teams;
    }

    public void setTeams(List<TeamStatisticsDto> teams) {
        this.teams = teams;
    }

    public List<PopularityDto> getPopularity() {
        return popularity;
    }

    public void setPopularity(List<PopularityDto> popularity) {
        this.popularity = popularity;
    }

    public List<TimelinePointDto> getTimeline() {
        return timeline;
    }

    public void setTimeline(List<TimelinePointDto> timeline) {
        this.timeline = timeline;
    }

    public List<ChallengeQuestionStatisticsDto> getQuestions() {
        return questions;
    }

    public void setQuestions(List<ChallengeQuestionStatisticsDto> questions) {
        this.questions = questions;
    }

    public List<ActivityPointDto> getActivity() {
        return activity;
    }

    public void setActivity(List<ActivityPointDto> activity) {
        this.activity = activity;
    }

    public List<ChallengeHeatmapDto> getChallengeHeatmap() {
        return challengeHeatmap;
    }

    public void setChallengeHeatmap(List<ChallengeHeatmapDto> challengeHeatmap) {
        this.challengeHeatmap = challengeHeatmap;
    }

    public List<ChallengeHeatmapBucketDto> getChallengeHeatmapTimeline() {
        return challengeHeatmapTimeline;
    }

    public void setChallengeHeatmapTimeline(List<ChallengeHeatmapBucketDto> challengeHeatmapTimeline) {
        this.challengeHeatmapTimeline = challengeHeatmapTimeline;
    }

    public List<GroupPopularityDto> getGroupPopularity() {
        return groupPopularity;
    }

    public void setGroupPopularity(List<GroupPopularityDto> groupPopularity) {
        this.groupPopularity = groupPopularity;
    }

    public List<ChallengeGroupStatisticsDto> getChallengeGroups() {
        return challengeGroups;
    }

    public void setChallengeGroups(List<ChallengeGroupStatisticsDto> challengeGroups) {
        this.challengeGroups = challengeGroups;
    }
}
