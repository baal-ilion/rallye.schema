package fr.vandriessche.rallyeschema.coreservice.models;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class GeneratedChallengeFormConfigurationRequest {
	private List<GeneratedFormRecognitionConfigurationRequest> pages = new ArrayList<>();
}
