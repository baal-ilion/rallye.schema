package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.HashMap;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class TeamPoint {
	public TeamPoint(Integer team) {
		this.team = team;
	}

	@Id
	private String id;

	@Indexed(unique = true)
	private Integer team;
	private Long total = 0l;
	private Map<Integer, StagePoint> stagePoints = new HashMap<>();
}
