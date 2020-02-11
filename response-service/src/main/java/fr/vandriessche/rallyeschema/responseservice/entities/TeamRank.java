package fr.vandriessche.rallyeschema.responseservice.entities;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class TeamRank<T> {
	private Integer team;
	private T value;
	private Integer upRank;
	private Integer downRank;

	public TeamRank(Integer team, T value) {
		super();
		this.team = team;
		this.value = value;
	}
}
