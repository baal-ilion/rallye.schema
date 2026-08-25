package fr.vandriessche.rallyeschema.coreservice.entities;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class Team {
	@Id
	private String id;

	@Indexed(unique = true)
	private Integer team;

	@Indexed(unique = true)
	private String name;

	private boolean present = false;
}
