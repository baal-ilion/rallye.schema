package fr.vandriessche.rallyeschema.formscannerservice.entities;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document
public class StageRanking {
	@Id
	private String id;

	@Indexed(unique = true)
	private Integer stage;

	private List<TeamRank<LocalDateTime>> begins = new ArrayList<>();
	private List<TeamRank<LocalDateTime>> ends = new ArrayList<>();
	private Map<String, List<TeamRank<Double>>> performances = new LinkedHashMap<>();

	public StageRanking(Integer stage) {
		this.stage = stage;
	}
}
