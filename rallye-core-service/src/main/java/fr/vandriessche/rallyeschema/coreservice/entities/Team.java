package fr.vandriessche.rallyeschema.coreservice.entities;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.hateoas.server.core.Relation;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
@Relation(collectionRelation = "teams")
public class Team {
	@Id
	private String id;

	@Indexed(unique = true)
	private Integer team;

	@Indexed(unique = true)
	private String name;

	private boolean present = false;
}
