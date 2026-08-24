package fr.vandriessche.rallyeschema.coreservice.entities;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class QuestionScoring {
	private String name;
	private Long point;

	public QuestionScoring(String name, Long point) {
		super();
		this.name = name;
		this.point = point;
	}
}
