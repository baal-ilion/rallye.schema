package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class StageParam {
	public StageParam(Integer stage) {
		this.stage = stage;
	}

	@Id
	private String id;

	@Indexed(unique = true)
	private Integer stage;

	private String name;
	private Boolean inactive;

	@DBRef
	private List<ResponseFileParam> responseFileParams = new ArrayList<>();

	private LinkedHashMap<String, QuestionPointParam> questionPointParams = new LinkedHashMap<>();
	private LinkedHashMap<String, PerformancePointParam> performancePointParams = new LinkedHashMap<>();

	private LinkedHashMap<String, QuestionParam> questionParams = new LinkedHashMap<>();

}
