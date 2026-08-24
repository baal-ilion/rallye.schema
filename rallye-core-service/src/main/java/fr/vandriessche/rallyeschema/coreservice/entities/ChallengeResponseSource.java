package fr.vandriessche.rallyeschema.coreservice.entities;

import com.fasterxml.jackson.annotation.JsonTypeName;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@RequiredArgsConstructor
@ToString
@JsonTypeName(ChallengeResponseSource.JSON_TYPE_NAME)
public class ChallengeResponseSource extends ResponseSource {
	public static final String JSON_TYPE_NAME = "ChallengeResponse";

	private Boolean pointUsed;

	public ChallengeResponseSource(String id, Boolean pointUsed) {
		super(id);
		this.pointUsed = pointUsed;
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (!super.equals(obj))
			return false;
		if (getClass() != obj.getClass())
			return false;
		return true;
	}

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = super.hashCode();
		result = prime * result + ((pointUsed == null) ? 0 : pointUsed.hashCode());
		return result;
	}
}
