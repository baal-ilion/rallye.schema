package fr.vandriessche.rallyeschema.coreservice.statistics.dto;

public class ActivityPointDto {
    private String bucket;
    private long active;

    public String getBucket() {
        return bucket;
    }

    public void setBucket(String bucket) {
        this.bucket = bucket;
    }

    public long getActive() {
        return active;
    }

    public void setActive(long active) {
        this.active = active;
    }
}
