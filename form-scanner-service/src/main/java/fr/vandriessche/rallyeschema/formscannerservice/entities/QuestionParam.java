package fr.vandriessche.rallyeschema.formscannerservice.entities;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class QuestionParam {
	private String name;
	private QuestionType type;
	private Boolean staff;

	public QuestionParam(String name, QuestionType type, Boolean staff) {
		super();
		this.name = name;
		this.type = type;
		this.staff = staff;
	}
}
