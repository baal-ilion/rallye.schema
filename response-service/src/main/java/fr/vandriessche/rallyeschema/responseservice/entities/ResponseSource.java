package fr.vandriessche.rallyeschema.responseservice.entities;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.JsonTypeInfo.As;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = As.PROPERTY, property = "type")
@JsonSubTypes({ @JsonSubTypes.Type(value = UserSource.class, name = UserSource.JSON_TYPE_NAME),
		@JsonSubTypes.Type(value = StageResponseSource.class, name = StageResponseSource.JSON_TYPE_NAME),
		@JsonSubTypes.Type(value = ResponseFileSource.class, name = ResponseFileSource.JSON_TYPE_NAME) })
public abstract class ResponseSource {
	private String id;
}
