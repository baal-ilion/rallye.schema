package fr.vandriessche.rallyeschema.coreservice.entities;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class ChallengeConfiguration {
	public ChallengeConfiguration(Integer challenge) {
		this.challenge = challenge;
	}

	@Id
	private String id;

	@Version
	private Long version;

	@Indexed(unique = true)
	private Integer challenge;

	private String name;

	@DBRef
	private ChallengeGroup group;

	@DBRef
	private List<FormRecognitionConfiguration> formRecognitionConfigurations = new ArrayList<>();

	private LinkedHashMap<String, QuestionScoring> questionScorings = new LinkedHashMap<>();
	private LinkedHashMap<String, PerformanceScoring> performanceScorings = new LinkedHashMap<>();

	private LinkedHashMap<String, QuestionDefinition> questionDefinitions = new LinkedHashMap<>();
}
