package fr.vandriessche.rallyeschema.coreservice.models;

import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class GeneratedFormRecognitionConfigurationRequest {
	private FormRecognitionConfiguration configuration;
	private String imageBase64;
	private String imageMediaType = "image/png";
	private String imageFileExtension = "png";
}
