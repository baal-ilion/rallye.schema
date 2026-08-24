package fr.vandriessche.rallyeschema.coreservice.statistics.dto;

import java.util.List;

public class ChallengeQuestionStatisticsDto {
    private int challenge;
    private String name;
    private List<ChallengeQuestionRateDto> questions;

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

    public List<ChallengeQuestionRateDto> getQuestions() {
        return questions;
    }

    public void setQuestions(List<ChallengeQuestionRateDto> questions) {
        this.questions = questions;
    }
}
