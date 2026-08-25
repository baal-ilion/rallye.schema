package fr.vandriessche.rallyeschema.coreservice.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.coreservice.entities.Team;
import fr.vandriessche.rallyeschema.coreservice.models.TeamModelAssembler;
import fr.vandriessche.rallyeschema.coreservice.services.TeamService;

@RestController
public class TeamController {
	public static final String URL = "/teams";

	@Autowired
	private TeamService teamService;

	@PostMapping(URL)
	public EntityModel<Team> addTeam(@RequestBody Team team, TeamModelAssembler assembler) {
		return assembler.toModel(teamService.addTeam(team));
	}

	@DeleteMapping(URL + "/{id}")
	public void deleteTeam(@PathVariable String id) {
		teamService.deleteTeam(id);
	}

	@GetMapping(URL + "/{id}")
	public EntityModel<Team> getTeam(@PathVariable String id, TeamModelAssembler assembler) {
		return assembler.toModel(teamService.getTeam(id));
	}

	@GetMapping(URL + "/search/findByTeam")
	public EntityModel<Team> getTeamByTeam(@RequestParam Integer team,
			TeamModelAssembler assembler) {
		return assembler.toModel(teamService.getTeamByTeam(team));
	}

	@GetMapping(URL)
	public CollectionModel<EntityModel<Team>> getTeams(TeamModelAssembler assembler) {
		return assembler.toCollectionModel(teamService.getTeams());
	}

	@PutMapping(URL + "/{team}/presence")
	public EntityModel<Team> setTeamPresenceByTeam(@PathVariable Integer team, @RequestParam boolean present,
			TeamModelAssembler assembler) {
		return assembler.toModel(teamService.setTeamPresenceByTeam(team, present));
	}

	@PutMapping(URL)
	public EntityModel<Team> updateTeam(@RequestBody Team team, TeamModelAssembler assembler) {
		return assembler.toModel(teamService.updateTeam(team));
	}
}
