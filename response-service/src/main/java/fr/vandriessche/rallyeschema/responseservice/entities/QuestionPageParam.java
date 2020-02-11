package fr.vandriessche.rallyeschema.responseservice.entities;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class QuestionPageParam extends QuestionParam {
	private List<String> responses = new ArrayList<>();

	public QuestionPageParam(String name, QuestionType type, List<String> responses2) {
		super(name, type, null);
		this.responses = responses2;
	}
}
