package fr.vandriessche.rallyeschema.responseservice.utils;

import java.util.Objects;

import fr.vandriessche.rallyeschema.responseservice.entities.FormArea;
import fr.vandriessche.rallyeschema.responseservice.entities.FormField;
import fr.vandriessche.rallyeschema.responseservice.entities.FormGroup;
import fr.vandriessche.rallyeschema.responseservice.entities.FormPoint;
import fr.vandriessche.rallyeschema.responseservice.entities.FormQuestion;
import fr.vandriessche.rallyeschema.responseservice.entities.FormTemplate;

public class ResponseFileUtil {
	private static FormArea copyProperties(com.albertoborsetta.formscanner.api.FormArea source, FormArea destination) {
		if (Objects.isNull(source))
			return null;
		copyProperties(source, (FormField) destination);

		destination.getCorners().clear();
		source.getCorners().entrySet().stream().forEach(entrie -> destination.getCorners().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormPoint())));

		destination.setText(source.getText());
		return destination;
	}

	private static FormField copyProperties(com.albertoborsetta.formscanner.api.FormField source,
			FormField destination) {
		if (Objects.isNull(source))
			return null;
		destination.setName(source.getName());
		destination.setType(source.getType());
		return destination;
	}

	private static FormGroup copyProperties(com.albertoborsetta.formscanner.api.FormGroup source,
			FormGroup destination) {
		if (Objects.isNull(source))
			return null;
		destination.getFields().clear();
		source.getFields().entrySet().stream().forEach(entrie -> destination.getFields().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormQuestion())));

		destination.getAreas().clear();
		source.getAreas().entrySet().stream().forEach(entrie -> destination.getAreas().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormArea())));
		destination.setLastFieldIndex(source.getLastFieldIndex());
		return destination;
	}

	private static FormPoint copyProperties(com.albertoborsetta.formscanner.api.FormPoint source,
			FormPoint destination) {
		if (Objects.isNull(source))
			return null;
		destination.setX(source.getX());
		destination.setY(source.getY());
		return destination;
	}

	private static FormQuestion copyProperties(com.albertoborsetta.formscanner.api.FormQuestion source,
			FormQuestion destination) {
		if (Objects.isNull(source))
			return null;
		copyProperties(source, (FormField) destination);

		destination.getPoints().clear();
		source.getPoints().entrySet().stream().forEach(entrie -> destination.getPoints().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormPoint())));

		destination.setMultiple(source.isMultiple());
		destination.setRejectMultiple(source.rejectMultiple());
		return destination;
	}

	public static FormTemplate copyProperties(com.albertoborsetta.formscanner.api.FormTemplate source,
			FormTemplate destination) {
		if (Objects.isNull(source))
			return null;
		destination.getGroups().clear();
		source.getGroups().entrySet().stream().forEach(entrie -> destination.getGroups().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormGroup())));

		destination.getCorners().clear();
		source.getCorners().entrySet().stream().forEach(entrie -> destination.getCorners().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormPoint())));

		destination.getPoints().clear();
		source.getFieldPoints().stream()
				.forEach(entrie -> destination.getPoints().add(copyProperties(entrie, new FormPoint())));

		destination.getAreas().clear();
		source.getFieldAreas().stream()
				.forEach(entrie -> destination.getAreas().add(copyProperties(entrie, new FormArea())));

		destination.setParentTemplate(copyProperties(source.getParentTemplate(), new FormTemplate()));

		destination.setCrop(source.getCrop());
		destination.setUsedGroupNames(source.getUsedGroupNames());

		destination.setCornerType(source.getCornerType());
		destination.setShape(source.getShape());
		destination.setName(source.getName());
		destination.setVersion(source.getVersion());
		destination.setRotation(source.getRotation());
		destination.setDiagonal(source.getDiagonal());
		destination.setGroupsEnabled(source.isGroupsEnabled());
		destination.setThreshold(source.getThreshold());
		destination.setDensity(source.getDensity());
		destination.setSize(source.getSize());
		return destination;
	}

}
