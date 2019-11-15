package fr.vandriessche.rallyeschema.formscannerservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StagePoint {
	private Integer stage;
	private Long total = 0l;
}
