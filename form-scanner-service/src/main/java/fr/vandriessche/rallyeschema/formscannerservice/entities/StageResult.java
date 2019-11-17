package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class StageResult {
	@Id
	private String id;

	private Integer stage;

	private Integer team;
	private Boolean checked;

	private List<ResponseResult> results = new ArrayList<>();

	private List<PreformanceResult> preformances = new ArrayList<>();

	public StageResult(Integer stage, Integer team) {
		this.stage = stage;
		this.team = team;
	}
}
