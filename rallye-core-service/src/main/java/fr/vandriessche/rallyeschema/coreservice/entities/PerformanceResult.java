package fr.vandriessche.rallyeschema.coreservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceResult {
	private String name;
	private Double performanceValue = null;
	private ResponseSource source;
}
