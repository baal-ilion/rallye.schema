package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.LinkedHashMap;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document
public class ResponceFileParam {
	@Id
	private String id;

	private Integer stage;
	private Integer page;

	private String template;

	private LinkedHashMap<String, QuestionPageParam> questions = new LinkedHashMap<>();
}
