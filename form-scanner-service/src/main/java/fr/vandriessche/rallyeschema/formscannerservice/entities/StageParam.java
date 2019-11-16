package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class StageParam {
	@Id
	private String id;

	@Indexed(unique = true)
	private Integer stage;

	@DBRef
	private List<ResponseFileParam> responseFileParams = new ArrayList<>();

}
