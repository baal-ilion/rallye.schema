package fr.vandriessche.rallyeschema.coreservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceScoringRange {
	private PerformanceRangeType type;
	private Double begin;
	private Double end;
	private Long point;
	private String expression;
}
