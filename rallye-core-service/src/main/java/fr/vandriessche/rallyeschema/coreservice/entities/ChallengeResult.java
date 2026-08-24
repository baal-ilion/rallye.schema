package fr.vandriessche.rallyeschema.coreservice.entities;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
@CompoundIndex(unique = true, def = "{'challenge' : 1, 'team' : 1}")
public class ChallengeResult {
	@Id
	private String id;

	private Integer challenge;
	private Integer team;

	private Instant begin;
	private Instant end;

	private Integer missing;

	private Boolean checked;

	private List<ResponseResult> results = new ArrayList<>();

	private List<PerformanceResult> performances = new ArrayList<>();

	private List<ResponseSource> responseSources = new ArrayList<>();

	public ChallengeResult(Integer challenge, Integer team) {
		this.challenge = challenge;
		this.team = team;
	}
}
