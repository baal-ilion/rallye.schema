package fr.vandriessche.rallyeschema.coreservice.entities;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class ChallengeRanking {
	@Id
	private String id;

	@Indexed(unique = true)
	private Integer challenge;

	private List<TeamRank<Instant>> begins = new ArrayList<>();
	private List<TeamRank<Instant>> ends = new ArrayList<>();
	private Map<String, List<TeamRank<Double>>> performances = new LinkedHashMap<>();

	public ChallengeRanking(Integer challenge) {
		this.challenge = challenge;
	}
}
