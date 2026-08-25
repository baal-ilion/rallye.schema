package fr.vandriessche.rallyeschema.coreservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionDefinition {
	private String name;
	private QuestionType type;
	private Boolean managedByOrganizer;
}
