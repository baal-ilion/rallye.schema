package fr.vandriessche.rallyeschema.responseservice.stats.dto;

public class PopularityDto {
    private int stage;
    private String name;
    private long participations;

    public int getStage() {
        return stage;
    }

    public void setStage(int stage) {
        this.stage = stage;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public long getParticipations() {
        return participations;
    }

    public void setParticipations(long participations) {
        this.participations = participations;
    }
}
