package fr.vandriessche.rallyeschema.coreservice.entities;

import java.time.Instant;
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
public class ChallengeResponse {
	@Id
	private String id;

	private Integer challenge;
	private Integer team;

	private Instant begin;
	private Instant end;

	private List<ResponseResult> results;
	private List<PerformanceResult> performances;

	private Long total;
	private List<QuestionPoint> questions;

	private boolean finalised = false;
	private boolean active = true;
}
