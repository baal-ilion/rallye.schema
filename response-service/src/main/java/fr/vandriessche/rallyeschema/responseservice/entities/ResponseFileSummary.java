package fr.vandriessche.rallyeschema.responseservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ResponseFileSummary {
	private String id;
	private Integer stage;
	private Integer page;
	private Integer team;
	private String processingStatus;
	private String processingError;
	private Boolean manualReviewRequired;
	private boolean availableForVerification;
	private boolean leasedByCurrentDevice;
}
