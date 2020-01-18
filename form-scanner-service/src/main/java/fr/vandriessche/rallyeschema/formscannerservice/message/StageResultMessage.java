package fr.vandriessche.rallyeschema.formscannerservice.message;

import org.springframework.data.annotation.Id;

import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResult;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StageResultMessage {
	@Id
	private String id;

	private Integer stage;
	private Integer team;

	public StageResultMessage(StageResult stageResult) {
		super();
		id = stageResult.getId();
		stage = stageResult.getStage();
		team = stageResult.getTeam();
	}

}
