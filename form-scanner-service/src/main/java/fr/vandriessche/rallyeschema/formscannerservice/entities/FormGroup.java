package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.HashMap;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
//@AllArgsConstructor
public class FormGroup {
	private HashMap<String, FormQuestion> fields = new HashMap<>();
	private HashMap<String, FormArea> areas = new HashMap<>();
	private int lastFieldIndex;
}
