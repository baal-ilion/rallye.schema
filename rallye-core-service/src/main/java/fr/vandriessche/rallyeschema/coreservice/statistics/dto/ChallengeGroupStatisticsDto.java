package fr.vandriessche.rallyeschema.coreservice.statistics.dto;

import java.util.ArrayList;
import java.util.List;

public class ChallengeGroupStatisticsDto {
    private String groupId;
    private String name;
    private List<ChallengeStatisticsDto> challenges = new ArrayList<>();

    public String getGroupId() {
        return groupId;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<ChallengeStatisticsDto> getChallenges() {
        return challenges;
    }

    public void setChallenges(List<ChallengeStatisticsDto> challenges) {
        this.challenges = challenges;
    }
}
