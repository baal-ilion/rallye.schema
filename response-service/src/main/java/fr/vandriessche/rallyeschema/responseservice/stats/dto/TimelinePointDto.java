package fr.vandriessche.rallyeschema.responseservice.stats.dto;

public class TimelinePointDto {
    private String bucket;
    private long starts;
    private long ends;
    private double averageDurationMinutes;

    public String getBucket() {
        return bucket;
    }

    public void setBucket(String bucket) {
        this.bucket = bucket;
    }

    public long getStarts() {
        return starts;
    }

    public void setStarts(long starts) {
        this.starts = starts;
    }

    public long getEnds() {
        return ends;
    }

    public void setEnds(long ends) {
        this.ends = ends;
    }

    public double getAverageDurationMinutes() {
        return averageDurationMinutes;
    }

    public void setAverageDurationMinutes(double averageDurationMinutes) {
        this.averageDurationMinutes = averageDurationMinutes;
    }
}
