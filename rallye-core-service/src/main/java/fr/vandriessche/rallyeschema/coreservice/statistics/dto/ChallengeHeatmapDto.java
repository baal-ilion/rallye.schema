package fr.vandriessche.rallyeschema.coreservice.statistics.dto;

import java.util.List;

public class ChallengeHeatmapDto {
    private Integer challenge;
    private String name;
    private List<ChallengeHeatmapBucketDto> buckets;

    public Integer getChallenge() {
        return challenge;
    }

    public void setChallenge(Integer challenge) {
        this.challenge = challenge;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<ChallengeHeatmapBucketDto> getBuckets() {
        return buckets;
    }

    public void setBuckets(List<ChallengeHeatmapBucketDto> buckets) {
        this.buckets = buckets;
    }
}
