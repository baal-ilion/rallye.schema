package fr.vandriessche.rallyeschema.responseservice.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResponseResult {
	private String name;
	private Boolean resultValue = null;
	private ResponseSource source;
}
