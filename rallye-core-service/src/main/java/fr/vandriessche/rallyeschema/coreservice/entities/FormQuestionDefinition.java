package fr.vandriessche.rallyeschema.coreservice.entities;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class FormQuestionDefinition extends QuestionDefinition {
	private List<String> responses = new ArrayList<>();

	public FormQuestionDefinition(String name, QuestionType type, List<String> responses2) {
		super(name, type, null);
		this.responses = responses2;
	}
}
