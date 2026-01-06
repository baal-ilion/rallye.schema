package fr.vandriessche.rallyeschema.responseservice.stats.dto;

import java.util.List;

public class StageQuestionsStatsDto {
    private int stage;
    private String name;
    private List<StageQuestionRateDto> questions;

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

    public List<StageQuestionRateDto> getQuestions() {
        return questions;
    }

    public void setQuestions(List<StageQuestionRateDto> questions) {
        this.questions = questions;
    }
}
