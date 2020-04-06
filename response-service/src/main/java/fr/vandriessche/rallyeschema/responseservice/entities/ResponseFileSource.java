package fr.vandriessche.rallyeschema.responseservice.entities;

import com.fasterxml.jackson.annotation.JsonTypeName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@JsonTypeName(ResponseFileSource.JSON_TYPE_NAME)
public class ResponseFileSource extends ResponseSource {
	public static final String JSON_TYPE_NAME = "ResponseFile";

	public ResponseFileSource(String id) {
		super(id);
	}
}
