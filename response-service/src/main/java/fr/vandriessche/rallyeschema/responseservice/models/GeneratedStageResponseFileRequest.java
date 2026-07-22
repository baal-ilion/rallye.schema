package fr.vandriessche.rallyeschema.responseservice.models;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class GeneratedStageResponseFileRequest {
	private List<GeneratedResponseFileParamRequest> pages = new ArrayList<>();
}
