package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.LinkedHashMap;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
@CompoundIndex(unique = true, def = "{'stage' : 1, 'page' : 1}")
public class ResponseFileParam {
	@Id
	private String id;

	private Integer stage;
	private Integer page;

	private String template;

	private Integer height;
	private Integer width;

	private LinkedHashMap<String, QuestionPageParam> questions = new LinkedHashMap<>();
}
