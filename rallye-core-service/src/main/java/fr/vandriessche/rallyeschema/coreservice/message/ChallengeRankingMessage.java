package fr.vandriessche.rallyeschema.coreservice.message;

import org.springframework.data.annotation.Id;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeRanking;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChallengeRankingMessage {
	@Id
	private String id;

	private Integer challenge;

	public ChallengeRankingMessage(ChallengeRanking challengeRanking) {
		super();
		id = challengeRanking.getId();
		challenge = challengeRanking.getChallenge();
	}
}
