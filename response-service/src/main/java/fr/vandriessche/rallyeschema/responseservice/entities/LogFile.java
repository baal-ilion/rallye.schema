package fr.vandriessche.rallyeschema.responseservice.entities;

import java.time.Instant;

import org.bson.types.Binary;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.lang.NonNull;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
@CompoundIndex(unique = true, def = "{'team' : 1, 'source' : 1}")
public class LogFile {
	@Id
	private String id;

	@NonNull
	private Integer team;
	@NonNull
	private String source;
	private Instant date;

	private Binary file;
	private String fileType;
	private String fileExtension;
}
