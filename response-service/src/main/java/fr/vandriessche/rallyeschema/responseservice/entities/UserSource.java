package fr.vandriessche.rallyeschema.responseservice.entities;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = false)
public class UserSource extends ResponseSource {
	public UserSource(String id) {
		super(id);
	}
}
