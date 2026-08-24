package fr.vandriessche.rallyeschema.coreservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionPoint {
	private String name;
	private long total = 0l;
}
