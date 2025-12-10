package fr.vandriessche.rallyeschema.responseservice.stats.dto;

import java.util.List;

public class StageHeatmapDto {
    private Integer stage;
    private String name;
    private List<StageHeatmapBucketDto> buckets;

    public Integer getStage() {
        return stage;
    }

    public void setStage(Integer stage) {
        this.stage = stage;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<StageHeatmapBucketDto> getBuckets() {
        return buckets;
    }

    public void setBuckets(List<StageHeatmapBucketDto> buckets) {
        this.buckets = buckets;
    }
}
