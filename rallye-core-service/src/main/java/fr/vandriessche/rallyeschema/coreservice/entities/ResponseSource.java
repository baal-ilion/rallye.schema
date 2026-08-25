package fr.vandriessche.rallyeschema.coreservice.entities;

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
		@JsonSubTypes.Type(value = ChallengeResponseSource.class, name = ChallengeResponseSource.JSON_TYPE_NAME),
		@JsonSubTypes.Type(value = SubmittedFormSource.class, name = SubmittedFormSource.JSON_TYPE_NAME) })
public abstract class ResponseSource {
	private String id;
}
