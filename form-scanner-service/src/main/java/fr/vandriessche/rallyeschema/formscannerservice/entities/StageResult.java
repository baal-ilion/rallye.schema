package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document
public class StageResult {
	public StageResult(Integer stage, Integer team) {
		this.stage = stage;
		this.team = team;
	}

	@Id
	private String id;

	private Integer stage;
	private Integer team;

	private Boolean checked;

	private List<ResponceResult> results = new ArrayList<>();

}
