package fr.vandriessche.rallyeschema.responseservice.entities;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public abstract class FormField {
	protected String name;
	protected FieldType type;
}
