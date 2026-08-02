package fr.vandriessche.rallyeschema.responseservice.entities;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class ResponseFileInfo {
	@Id
	private String id;

	private Integer stage;
	private Integer page;
	private Integer team;
	private boolean identificationManuallyLocked;

	private Boolean checked;
	private String processingStatus;
	private Boolean automaticMarkerDetection;
	private Boolean manualReviewRequired;
	private Integer detectedRotationDegrees;
	private Double referenceAlignmentError;
	private Boolean localAlignmentApplied;
	private Double localAlignmentConfidence;
	private Integer localAlignmentAnchorCount;
	private Double localAlignmentMeanDisplacement;
	private Double localAlignmentMaximumDisplacement;
	private Map<String, Boolean> processingCorrectionValues = new LinkedHashMap<>();
	private Map<String, Double> processingCorrectionConfidences = new LinkedHashMap<>();
	private Map<String, List<String>> processingCorrectionMarks = new LinkedHashMap<>();
	private List<String> processingCorrectionDifferences = new ArrayList<>();

	// private Date date;

	// private List<ResponseResult> results;

	private FormTemplate filledForm;

}
