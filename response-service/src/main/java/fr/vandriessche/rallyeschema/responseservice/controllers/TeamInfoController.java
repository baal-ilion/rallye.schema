package fr.vandriessche.rallyeschema.responseservice.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.responseservice.models.TeamInfoModelAssembler;
import fr.vandriessche.rallyeschema.responseservice.services.TeamInfoService;

@RestController
public class TeamInfoController {
	@Autowired
	private TeamInfoService teamInfoService;

	public static final String URL = "/teamInfos";

	@GetMapping(URL)
	public CollectionModel<EntityModel<TeamInfo>> getTeamInfos(TeamInfoModelAssembler assembler) {
		return assembler.toCollectionModel(teamInfoService.getTeamInfos());
	}

	@GetMapping(URL + "/search/findByTeam")
	public EntityModel<TeamInfo> getTeamInfoByStageAndPage(@RequestParam Integer team,
			TeamInfoModelAssembler assembler) {
		return assembler.toModel(teamInfoService.getTeamInfoByTeam(team));
	}

	@GetMapping(URL + "/{id}")
	public EntityModel<TeamInfo> getTeamInfo(@PathVariable String id, TeamInfoModelAssembler assembler) {
		return assembler.toModel(teamInfoService.getTeamInfo(id));
	}

	@PostMapping(URL)
	public EntityModel<TeamInfo> addTeamInfo(@RequestBody TeamInfo teamInfo, TeamInfoModelAssembler assembler) {
		return assembler.toModel(teamInfoService.addTeamInfo(teamInfo));
	}

	@PutMapping(URL)
	public EntityModel<TeamInfo> updateTeamInfo(@RequestBody TeamInfo teamInfo, TeamInfoModelAssembler assembler) {
		return assembler.toModel(teamInfoService.updateTeamInfo(teamInfo));
	}
}
