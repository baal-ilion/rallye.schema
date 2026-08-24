package fr.vandriessche.rallyeschema.coreservice.message;

import org.springframework.data.annotation.Id;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChallengeResponseMessage {
	@Id
	private String id;

	private Integer challenge;
	private Integer team;

	public ChallengeResponseMessage(ChallengeResponse challengeResponse) {
		super();
		id = challengeResponse.getId();
		challenge = challengeResponse.getChallenge();
		team = challengeResponse.getTeam();
	}

}