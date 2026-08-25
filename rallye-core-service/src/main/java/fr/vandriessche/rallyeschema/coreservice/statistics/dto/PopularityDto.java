package fr.vandriessche.rallyeschema.coreservice.statistics.dto;

public class PopularityDto {
    private int challenge;
    private String name;
    private long participations;

    public int getChallenge() {
        return challenge;
    }

    public void setChallenge(int challenge) {
        this.challenge = challenge;
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
