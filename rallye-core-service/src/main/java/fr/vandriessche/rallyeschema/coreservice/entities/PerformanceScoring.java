package fr.vandriessche.rallyeschema.coreservice.entities;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class PerformanceScoring {
	private String name;
	private List<PerformanceScoringRange> ranges = new ArrayList<>();

	public PerformanceScoring(String name, Long point) {
		super();
		this.name = name;
		this.ranges.add(new PerformanceScoringRange(PerformanceRangeType.VALUE, null, null, point, null));
	}
}
