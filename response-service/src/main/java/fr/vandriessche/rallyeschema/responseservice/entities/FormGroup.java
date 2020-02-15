package fr.vandriessche.rallyeschema.responseservice.entities;

import java.util.HashMap;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class FormGroup {
	private HashMap<String, FormQuestion> fields = new HashMap<>();
	private HashMap<String, FormArea> areas = new HashMap<>();
	private int lastFieldIndex;
}
