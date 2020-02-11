package fr.vandriessche.rallyeschema.responseservice.entities;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
@CompoundIndex(unique = true, def = "{'stage' : 1, 'team' : 1}")
public class StageResponse {
	@Id
	private String id;

	private Integer stage;
	private Integer team;

	private LocalDateTime begin;
	private LocalDateTime end;

	private List<ResponseResult> results;
	private List<PerformanceResult> performances;

	private Long total;
	private List<QuestionPoint> questions;

	private boolean finalised = false;
	private boolean active = true;
}
