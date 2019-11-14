package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.LinkedHashMap;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionPageParam {
	private String name;
	private QuestionPageType type;
	private LinkedHashMap<String, Boolean> responces = new LinkedHashMap<>();
}
