package fr.vandriessche.rallyeschema.formscannerservice.models;

import java.util.LinkedHashMap;

import org.springframework.hateoas.RepresentationModel;
import org.springframework.hateoas.server.core.Relation;

import fr.vandriessche.rallyeschema.formscannerservice.entities.QuestionParam;
import fr.vandriessche.rallyeschema.formscannerservice.entities.QuestionPointParam;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@Relation(collectionRelation = "stageParams")
public class StageParamModel extends RepresentationModel<StageParamModel> {
	private String id;
	private Integer stage;
	private String name;
	private Boolean inactive;

	private LinkedHashMap<String, QuestionPointParam> questionPointParams;
	private LinkedHashMap<String, QuestionParam> questionParams;

}
