package fr.vandriessche.rallyeschema.coreservice.entities;

import java.util.LinkedHashMap;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
@CompoundIndex(unique = true, def = "{'challenge' : 1, 'page' : 1}")
public class FormRecognitionConfiguration {
	@Id
	private String id;

	private Integer challenge;
	private Integer page;

	private String template;

	private Integer height;
	private Integer width;

	private LinkedHashMap<String, FormQuestionDefinition> questions = new LinkedHashMap<>();
}
