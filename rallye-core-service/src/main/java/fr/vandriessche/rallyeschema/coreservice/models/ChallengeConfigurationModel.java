package fr.vandriessche.rallyeschema.coreservice.models;

import java.util.LinkedHashMap;

import org.springframework.hateoas.RepresentationModel;
import org.springframework.hateoas.server.core.Relation;

import fr.vandriessche.rallyeschema.coreservice.entities.PerformanceScoring;
import fr.vandriessche.rallyeschema.coreservice.entities.QuestionDefinition;
import fr.vandriessche.rallyeschema.coreservice.entities.QuestionScoring;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeGroup;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@Relation(collectionRelation = "challengeConfigurations")
public class ChallengeConfigurationModel extends RepresentationModel<ChallengeConfigurationModel> {

    private String id;
    private Long version;
    private Integer challenge;
    private String name;
    private ChallengeGroup group;
    private String groupId;
    private String groupName;

    private LinkedHashMap<String, QuestionScoring> questionScorings;
    private LinkedHashMap<String, PerformanceScoring> performanceScorings;
    private LinkedHashMap<String, QuestionDefinition> questionDefinitions;

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

    public ChallengeGroup getGroup() {
        return group;
    }
    public void setGroup(ChallengeGroup group) {
        this.group = group;
    }
}
