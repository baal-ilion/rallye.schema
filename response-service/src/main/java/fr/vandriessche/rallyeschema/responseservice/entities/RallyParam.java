package fr.vandriessche.rallyeschema.responseservice.entities;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class RallyParam {
	public static final String SINGLETON_ID = "rally";

	@Id
	private String id = SINGLETON_ID;

	@Version
	private Long version;

	private String title = "";
	private String date = "";
	private Boolean showLogo = true;
	private String logoUrl = "";
	private Double titleSpacingBeforeMm = 0D;
	private Double titleSpacingAfterMm = 0D;
	private Double correctionCellWidthCm = 0.53D;
	private Double correctionCellHeightCm = 0.53D;
	private String referenceFormDesignId = FormDesign.REFERENCE_ID;
}
