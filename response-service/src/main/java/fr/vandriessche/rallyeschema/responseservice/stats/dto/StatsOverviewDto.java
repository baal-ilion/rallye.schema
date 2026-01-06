package fr.vandriessche.rallyeschema.responseservice.stats.dto;

public class StatsOverviewDto {
    private long totalTeams;
    private long totalStages;
    private long totalParticipation;
    private long inProgress;
    private long finished;
    private long notStarted;
    private double totalDurationMinutes;
    private double averageDurationMinutes;

    public long getTotalTeams() {
        return totalTeams;
    }

    public void setTotalTeams(long totalTeams) {
        this.totalTeams = totalTeams;
    }

    public long getTotalStages() {
        return totalStages;
    }

    public void setTotalStages(long totalStages) {
        this.totalStages = totalStages;
    }

    public long getTotalParticipation() {
        return totalParticipation;
    }

    public void setTotalParticipation(long totalParticipation) {
        this.totalParticipation = totalParticipation;
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

    public long getNotStarted() {
        return notStarted;
    }

    public void setNotStarted(long notStarted) {
        this.notStarted = notStarted;
    }

    public double getTotalDurationMinutes() {
        return totalDurationMinutes;
    }

    public void setTotalDurationMinutes(double totalDurationMinutes) {
        this.totalDurationMinutes = totalDurationMinutes;
    }

    public double getAverageDurationMinutes() {
        return averageDurationMinutes;
    }

    public void setAverageDurationMinutes(double averageDurationMinutes) {
        this.averageDurationMinutes = averageDurationMinutes;
    }
}
