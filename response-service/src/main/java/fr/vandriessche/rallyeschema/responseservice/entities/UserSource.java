package fr.vandriessche.rallyeschema.responseservice.entities;

import com.fasterxml.jackson.annotation.JsonTypeName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = false)
@JsonTypeName(UserSource.JSON_TYPE_NAME)
public class UserSource extends ResponseSource {
	public static final String JSON_TYPE_NAME = "User";

	public UserSource(String id) {
		super(id);
	}
}
