package fr.vandriessche.rallyeschema.formscannerservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionParam {
	private String name;
	private QuestionType type;
	private Boolean staff;
}
