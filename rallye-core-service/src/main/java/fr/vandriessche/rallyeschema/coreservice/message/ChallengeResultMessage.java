package fr.vandriessche.rallyeschema.coreservice.message;

import org.springframework.data.annotation.Id;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChallengeResultMessage {
	@Id
	private String id;

	private Integer challenge;
	private Integer team;

	public ChallengeResultMessage(ChallengeResult challengeResult) {
		super();
		id = challengeResult.getId();
		challenge = challengeResult.getChallenge();
		team = challengeResult.getTeam();
	}

}
