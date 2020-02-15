package fr.vandriessche.rallyeschema.responseservice.entities;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class QuestionPointParam {
	private String name;
	private Long point;

	public QuestionPointParam(String name, Long point) {
		super();
		this.name = name;
		this.point = point;
	}
}
