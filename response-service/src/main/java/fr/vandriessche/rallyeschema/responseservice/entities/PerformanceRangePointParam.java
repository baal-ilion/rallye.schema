package fr.vandriessche.rallyeschema.responseservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceRangePointParam {
	private PerformanceRangeType type;
	private Double begin;
	private Double end;
	private Long point;
	private String expression;
}
