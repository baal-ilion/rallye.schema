package fr.vandriessche.rallyeschema.coreservice.entities;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public abstract class FormField {
	protected String name;
	protected FieldType type;
}
