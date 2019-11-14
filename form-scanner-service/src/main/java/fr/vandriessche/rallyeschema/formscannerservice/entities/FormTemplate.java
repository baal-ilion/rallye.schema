package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.util.ArrayList;
import java.util.HashMap;

import com.albertoborsetta.formscanner.api.commons.Constants.CornerType;
import com.albertoborsetta.formscanner.api.commons.Constants.Corners;
import com.albertoborsetta.formscanner.api.commons.Constants.ShapeType;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class FormTemplate {
	private HashMap<String, FormGroup> groups = new HashMap<>();
	private HashMap<Corners, FormPoint> corners = new HashMap<>();

	private ArrayList<FormPoint> points = new ArrayList<>();
	private ArrayList<FormArea> areas = new ArrayList<>();

	private CornerType cornerType;
	private ShapeType shape;
	private FormTemplate parentTemplate;
	private String name;
	private String version = null;
	private double rotation;
	private double diagonal;
	private int height;
	private int width;
	private Integer threshold;
	private Integer density;
	private Integer size;
	private boolean isGroupsEnabled = false;
	private HashMap<String, Integer> crop = new HashMap<>();
	private ArrayList<String> usedGroupNames = new ArrayList<>();
}
