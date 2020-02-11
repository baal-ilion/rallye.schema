package fr.vandriessche.rallyeschema.responseservice.entities;

import org.bson.types.Binary;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class ResponseFile {
	@Id
	private String id;

	private Binary file;
	private String fileType;
	private String fileExtension;
	@DBRef
	private ResponseFileInfo info;
}
