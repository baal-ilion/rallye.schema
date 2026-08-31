package fr.vandriessche.rallyeschema.coreservice.entities;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class FormDesign {
	public static final String REFERENCE_ID = "reference";

	@Id
	private String id;

	@Version
	private Long version;

	@Indexed(unique = true, sparse = true)
	private String challengeConfigurationId;

	private Integer schemaVersion;
	private boolean designerManaged;
	private Map<String, Object> content = new LinkedHashMap<>();
	private Instant updatedAt;
}
