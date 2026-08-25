package fr.vandriessche.rallyeschema.coreservice.entities;

import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ResponseResult {
	private String name;
	private Boolean resultValue = null;
	private ResponseSource source;
	private List<String> correctionMarks;

	public ResponseResult(String name, Boolean resultValue, ResponseSource source) {
		this.name = name;
		this.resultValue = resultValue;
		this.source = source;
	}
}
