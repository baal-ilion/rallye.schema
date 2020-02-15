package fr.vandriessche.rallyeschema.responseservice.entities;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class ResponseFileInfo {
	@Id
	private String id;

	private Integer stage;
	private Integer page;
	private Integer team;

	private Boolean checked;

	// private Date date;

	// private List<ResponseResult> results;

	private FormTemplate filledForm;

}
