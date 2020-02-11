package fr.vandriessche.rallyeschema.responseservice.entities;

import java.util.ArrayList;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StagePoint {
	private Integer stage;

	private long total = 0l;
	private List<QuestionPoint> questions = new ArrayList<>();

	public StagePoint(Integer stage, long total) {
		super();
		this.stage = stage;
		this.total = total;
	}
}
