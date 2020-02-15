package fr.vandriessche.rallyeschema.responseservice.message;

import org.springframework.data.annotation.Id;

import fr.vandriessche.rallyeschema.responseservice.entities.StageRanking;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StageRankingMessage {
	@Id
	private String id;

	private Integer stage;

	public StageRankingMessage(StageRanking stageRanking) {
		super();
		id = stageRanking.getId();
		stage = stageRanking.getStage();
	}
}
