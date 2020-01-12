package fr.vandriessche.rallyeschema.formscannerservice.entities;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ResponseFileSource extends ResponseSource {
	public ResponseFileSource(String id) {
		super(id);
	}
}
