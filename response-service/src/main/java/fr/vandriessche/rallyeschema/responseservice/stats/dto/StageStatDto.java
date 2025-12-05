package fr.vandriessche.rallyeschema.responseservice.stats.dto;

public class StageStatDto {
    private int stage;
    private String name;
    private long participants;
    private long finished;
    private long inProgress;
    private double averageDurationMinutes;
    private double minDurationMinutes;
    private double maxDurationMinutes;
    private double averageScorePercent;
    private double minScorePercent;
    private double maxScorePercent;
    private Double minPerformanceValue;
    private Double averagePerformanceValue;
    private Double maxPerformanceValue;
    private Long totalQuestionAnswers;
    private Long totalQuestionSuccess;
    private Long minQuestionSuccess;
    private Double averageQuestionSuccess;
    private Long maxQuestionSuccess;
    private String peakActivityBucket;
    private Long peakActivityCount;

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

    public long getParticipants() {
        return participants;
    }

    public void setParticipants(long participants) {
        this.participants = participants;
    }

    public long getFinished() {
        return finished;
    }

    public void setFinished(long finished) {
        this.finished = finished;
    }

    public long getInProgress() {
        return inProgress;
    }

    public void setInProgress(long inProgress) {
        this.inProgress = inProgress;
    }

    public double getAverageDurationMinutes() {
        return averageDurationMinutes;
    }

    public void setAverageDurationMinutes(double averageDurationMinutes) {
        this.averageDurationMinutes = averageDurationMinutes;
    }

    public double getMinDurationMinutes() {
        return minDurationMinutes;
    }

    public void setMinDurationMinutes(double minDurationMinutes) {
        this.minDurationMinutes = minDurationMinutes;
    }

    public double getMaxDurationMinutes() {
        return maxDurationMinutes;
    }

    public void setMaxDurationMinutes(double maxDurationMinutes) {
        this.maxDurationMinutes = maxDurationMinutes;
    }

    public double getAverageScorePercent() {
        return averageScorePercent;
    }

    public void setAverageScorePercent(double averageScorePercent) {
        this.averageScorePercent = averageScorePercent;
    }

    public double getMinScorePercent() {
        return minScorePercent;
    }

    public void setMinScorePercent(double minScorePercent) {
        this.minScorePercent = minScorePercent;
    }

    public double getMaxScorePercent() {
        return maxScorePercent;
    }

    public void setMaxScorePercent(double maxScorePercent) {
        this.maxScorePercent = maxScorePercent;
    }

    public Double getMinPerformanceValue() {
        return minPerformanceValue;
    }

    public void setMinPerformanceValue(Double minPerformanceValue) {
        this.minPerformanceValue = minPerformanceValue;
    }

    public Double getAveragePerformanceValue() {
        return averagePerformanceValue;
    }

    public void setAveragePerformanceValue(Double averagePerformanceValue) {
        this.averagePerformanceValue = averagePerformanceValue;
    }

    public Double getMaxPerformanceValue() {
        return maxPerformanceValue;
    }

    public void setMaxPerformanceValue(Double maxPerformanceValue) {
        this.maxPerformanceValue = maxPerformanceValue;
    }

    public Long getTotalQuestionAnswers() {
        return totalQuestionAnswers;
    }

    public void setTotalQuestionAnswers(Long totalQuestionAnswers) {
        this.totalQuestionAnswers = totalQuestionAnswers;
    }

    public Long getTotalQuestionSuccess() {
        return totalQuestionSuccess;
    }

    public void setTotalQuestionSuccess(Long totalQuestionSuccess) {
        this.totalQuestionSuccess = totalQuestionSuccess;
    }

    public Long getMinQuestionSuccess() {
        return minQuestionSuccess;
    }

    public void setMinQuestionSuccess(Long minQuestionSuccess) {
        this.minQuestionSuccess = minQuestionSuccess;
    }

    public Double getAverageQuestionSuccess() {
        return averageQuestionSuccess;
    }

    public void setAverageQuestionSuccess(Double averageQuestionSuccess) {
        this.averageQuestionSuccess = averageQuestionSuccess;
    }

    public Long getMaxQuestionSuccess() {
        return maxQuestionSuccess;
    }

    public void setMaxQuestionSuccess(Long maxQuestionSuccess) {
        this.maxQuestionSuccess = maxQuestionSuccess;
    }

    public String getPeakActivityBucket() {
        return peakActivityBucket;
    }

    public void setPeakActivityBucket(String peakActivityBucket) {
        this.peakActivityBucket = peakActivityBucket;
    }

    public Long getPeakActivityCount() {
        return peakActivityCount;
    }

    public void setPeakActivityCount(Long peakActivityCount) {
        this.peakActivityCount = peakActivityCount;
    }
}
