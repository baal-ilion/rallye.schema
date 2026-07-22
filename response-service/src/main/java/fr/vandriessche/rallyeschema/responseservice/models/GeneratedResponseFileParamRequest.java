package fr.vandriessche.rallyeschema.responseservice.models;

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileParam;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class GeneratedResponseFileParamRequest {
	private ResponseFileParam param;
	private String modelBase64;
	private String modelFileType = "image/png";
	private String modelFileExtension = "png";
}
