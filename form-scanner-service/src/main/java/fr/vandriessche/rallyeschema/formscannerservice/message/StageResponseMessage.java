package fr.vandriessche.rallyeschema.formscannerservice.message;

import org.springframework.data.annotation.Id;

import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResponse;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StageResponseMessage {
	@Id
	private String id;

	private Integer stage;
	private Integer team;

	public StageResponseMessage(StageResponse stageResponse) {
		super();
		id = stageResponse.getId();
		stage = stageResponse.getStage();
		team = stageResponse.getTeam();
	}

}