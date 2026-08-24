package fr.vandriessche.rallyeschema.coreservice.entities;

import com.fasterxml.jackson.annotation.JsonTypeName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@JsonTypeName(SubmittedFormSource.JSON_TYPE_NAME)
public class SubmittedFormSource extends ResponseSource {
	public static final String JSON_TYPE_NAME = "SubmittedForm";

	public SubmittedFormSource(String id) {
		super(id);
	}
}
