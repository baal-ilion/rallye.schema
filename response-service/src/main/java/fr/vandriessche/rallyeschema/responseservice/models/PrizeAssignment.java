package fr.vandriessche.rallyeschema.responseservice.models;

public class PrizeAssignment {

    private PrizeType type;
    private String groupId;    // null si type = GENERAL
    private String groupName;  // null si type = GENERAL

    private Integer team;      // numéro d'équipe
    private String teamName;   // nom de l'équipe

    private Long score;        // score utilisé pour décider (général ou groupe)
    private Integer rank;      // rang utilisé (général ou de groupe)

    public PrizeAssignment() {
    }

    public PrizeAssignment(PrizeType type,
                           String groupId,
                           String groupName,
                           Integer team,
                           String teamName,
                           Long score,
                           Integer rank) {
        this.type = type;
        this.groupId = groupId;
        this.groupName = groupName;
        this.team = team;
        this.teamName = teamName;
        this.score = score;
        this.rank = rank;
    }

    public PrizeType getType() {
        return type;
    }

    public void setType(PrizeType type) {
        this.type = type;
    }

    public String getGroupId() {
        return groupId;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public String getGroupName() {
        return groupName;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public Integer getTeam() {
        return team;
    }

    public void setTeam(Integer team) {
        this.team = team;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }

    public Long getScore() {
        return score;
    }

    public void setScore(Long score) {
        this.score = score;
    }

    public Integer getRank() {
        return rank;
    }

    public void setRank(Integer rank) {
        this.rank = rank;
    }
}
