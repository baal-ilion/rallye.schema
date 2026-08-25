package fr.vandriessche.rallyeschema.coreservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SubmittedFormSummary {
	private String id;
	private Integer challenge;
	private Integer page;
	private Integer team;
	private String processingStatus;
	private String processingError;
	private Boolean manualReviewRequired;
	private boolean availableForVerification;
	private boolean leasedByCurrentDevice;
}
