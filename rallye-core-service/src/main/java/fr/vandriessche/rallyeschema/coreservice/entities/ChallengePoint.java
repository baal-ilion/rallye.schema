package fr.vandriessche.rallyeschema.coreservice.entities;

import java.util.ArrayList;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChallengePoint {
	private Integer challenge;

	private long total = 0l;
	private List<QuestionPoint> questions = new ArrayList<>();

	public ChallengePoint(Integer challenge, long total) {
		super();
		this.challenge = challenge;
		this.total = total;
	}
}
