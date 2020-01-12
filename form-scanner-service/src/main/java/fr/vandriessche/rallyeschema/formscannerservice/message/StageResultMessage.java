package fr.vandriessche.rallyeschema.formscannerservice.message;

import org.springframework.data.annotation.Id;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StageResultMessage {
	@Id
	private String id;
}
