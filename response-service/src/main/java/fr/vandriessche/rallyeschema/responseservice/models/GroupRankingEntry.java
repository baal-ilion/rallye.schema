package fr.vandriessche.rallyeschema.responseservice.models;

public class GroupRankingEntry {

    private String groupId;
    private String groupName;
    private Integer team;
    private String teamName;
    private Long groupScore;
    private Integer groupRank;
    private boolean present;

    public GroupRankingEntry() {
    }

    public GroupRankingEntry(String groupId,
                             String groupName,
                             Integer team,
                             String teamName,
                             Long groupScore,
                             Integer groupRank,
                             boolean present) {
        this.groupId = groupId;
        this.groupName = groupName;
        this.team = team;
        this.teamName = teamName;
        this.groupScore = groupScore;
        this.groupRank = groupRank;
        this.present = present;
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

    public Long getGroupScore() {
        return groupScore;
    }

    public void setGroupScore(Long groupScore) {
        this.groupScore = groupScore;
    }

    public Integer getGroupRank() {
        return groupRank;
    }

    public void setGroupRank(Integer groupRank) {
        this.groupRank = groupRank;
    }

    public boolean isPresent() {
        return present;
    }

    public void setPresent(boolean present) {
        this.present = present;
    }
}
