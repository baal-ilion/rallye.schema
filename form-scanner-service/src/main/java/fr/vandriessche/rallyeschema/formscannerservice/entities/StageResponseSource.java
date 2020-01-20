package fr.vandriessche.rallyeschema.formscannerservice.entities;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@RequiredArgsConstructor
@ToString
public class StageResponseSource extends ResponseSource {
	private Boolean pointUsed;

	public StageResponseSource(String id, Boolean pointUsed) {
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
