package fr.vandriessche.rallyeschema.responseservice.stats.dto;

import java.util.ArrayList;
import java.util.List;

public class StageGroupStatsDto {
    private String groupId;
    private String name;
    private List<StageStatDto> stages = new ArrayList<>();

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

    public List<StageStatDto> getStages() {
        return stages;
    }

    public void setStages(List<StageStatDto> stages) {
        this.stages = stages;
    }
}
