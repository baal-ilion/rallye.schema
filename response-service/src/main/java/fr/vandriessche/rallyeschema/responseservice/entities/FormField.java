package fr.vandriessche.rallyeschema.responseservice.entities;

import com.albertoborsetta.formscanner.api.commons.Constants.FieldType;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public abstract class FormField {
	protected String name;
	protected FieldType type;
}
