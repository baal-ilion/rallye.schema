package fr.vandriessche.rallyeschema.responseservice.models;

import java.util.LinkedHashMap;

import org.springframework.hateoas.RepresentationModel;
import org.springframework.hateoas.server.core.Relation;

import fr.vandriessche.rallyeschema.responseservice.entities.PerformancePointParam;
import fr.vandriessche.rallyeschema.responseservice.entities.QuestionParam;
import fr.vandriessche.rallyeschema.responseservice.entities.QuestionPointParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StageGroup;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@Relation(collectionRelation = "stageParams")
public class StageParamModel extends RepresentationModel<StageParamModel> {

    private String id;
    private Long version;
    private Integer stage;
    private String name;
    private StageGroup group;
    private String groupId;
    private String groupName;

    private LinkedHashMap<String, QuestionPointParam> questionPointParams;
    private LinkedHashMap<String, PerformancePointParam> performancePointParams;
    private LinkedHashMap<String, QuestionParam> questionParams;

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

    public StageGroup getGroup() {
        return group;
    }
    public void setGroup(StageGroup group) {
        this.group = group;
    }
}
