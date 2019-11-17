package fr.vandriessche.rallyeschema.formscannerservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PreformanceResult {
	private String name;
	private Double preformanceValue = null;
}
