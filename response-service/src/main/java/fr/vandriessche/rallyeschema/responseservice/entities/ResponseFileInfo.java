package fr.vandriessche.rallyeschema.responseservice.entities;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

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
	@Indexed(unique = true, sparse = true)
	private String uploadId;
	private String processingError;
	private Instant processingCreatedAt;
	private Instant processingStartedAt;
	private Instant processingCompletedAt;
	private String verificationLeaseOwner;
	private Instant verificationLeaseExpiresAt;
	private Boolean automaticMarkerDetection;
	private Boolean manualReviewRequired;
	private Integer detectedRotationDegrees;
	private Double referenceAlignmentError;
	private Boolean localAlignmentApplied;
	private Double localAlignmentConfidence;
	private Integer localAlignmentAnchorCount;
	private Double localAlignmentMeanDisplacement;
	private Double localAlignmentMaximumDisplacement;
	// private Date date;

	// private List<ResponseResult> results;

	private FormTemplate filledForm;

}
