package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.HashMap;

import com.albertoborsetta.formscanner.api.commons.Constants.Corners;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class FormArea extends FormField {
	private HashMap<Corners, FormPoint> corners = new HashMap<>();
	private String text;

	public FormArea() {
		super();
	}
}
