package fr.vandriessche.rallyeschema.responseservice.stats.dto;

public class TeamStatDto {
    private int team;
    private String name;
    private long inProgress;
    private long finished;
    private double totalDurationMinutes;

    public int getTeam() {
        return team;
    }

    public void setTeam(int team) {
        this.team = team;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public long getInProgress() {
        return inProgress;
    }

    public void setInProgress(long inProgress) {
        this.inProgress = inProgress;
    }

    public long getFinished() {
        return finished;
    }

    public void setFinished(long finished) {
        this.finished = finished;
    }

    public double getTotalDurationMinutes() {
        return totalDurationMinutes;
    }

    public void setTotalDurationMinutes(double totalDurationMinutes) {
        this.totalDurationMinutes = totalDurationMinutes;
    }
}
