package fr.vandriessche.rallyeschema.responseservice.entities;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;

import org.apache.commons.lang3.StringUtils;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class FormQuestion extends FormField {
	private boolean multiple;
	private HashMap<String, FormPoint> points = new HashMap<>();
	private boolean rejectMultiple = false;

	public FormQuestion() {
		super();
	}

	public String getValues() {
		ArrayList<String> results = new ArrayList<>(points.keySet());
		Collections.sort(results);
		StringBuilder ret = new StringBuilder();
		for (String result : results) {
			if (StringUtils.isEmpty(ret.toString())) {
				ret.append(result);
			} else {
				ret.append("|").append(result);
			}
		}
		return ret.toString();
	}
}
