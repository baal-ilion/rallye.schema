package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class PerformancePointParam {
	private String name;
	private List<PerformanceRangePointParam> ranges = new ArrayList<>();

	public PerformancePointParam(String name, Long point) {
		super();
		this.name = name;
		this.ranges.add(new PerformanceRangePointParam(PerformanceRangeType.VALUE, null, null, point));
	}
}
