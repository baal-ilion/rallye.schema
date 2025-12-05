package fr.vandriessche.rallyeschema.responseservice.stats.dto;

import java.util.List;

public class StatsResponseDto {
    private StatsOverviewDto overview;
    private List<StageStatDto> stages;
    private List<TeamStatDto> teams;
    private List<PopularityDto> popularity;
    private List<TimelinePointDto> timeline;
    private List<StageQuestionsStatsDto> questions;
    private List<ActivityPointDto> activity;
    private List<GroupPopularityDto> groupPopularity;

    public StatsOverviewDto getOverview() {
        return overview;
    }

    public void setOverview(StatsOverviewDto overview) {
        this.overview = overview;
    }

    public List<StageStatDto> getStages() {
        return stages;
    }

    public void setStages(List<StageStatDto> stages) {
        this.stages = stages;
    }

    public List<TeamStatDto> getTeams() {
        return teams;
    }

    public void setTeams(List<TeamStatDto> teams) {
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

    public List<StageQuestionsStatsDto> getQuestions() {
        return questions;
    }

    public void setQuestions(List<StageQuestionsStatsDto> questions) {
        this.questions = questions;
    }

    public List<ActivityPointDto> getActivity() {
        return activity;
    }

    public void setActivity(List<ActivityPointDto> activity) {
        this.activity = activity;
    }

    public List<GroupPopularityDto> getGroupPopularity() {
        return groupPopularity;
    }

    public void setGroupPopularity(List<GroupPopularityDto> groupPopularity) {
        this.groupPopularity = groupPopularity;
    }
}
