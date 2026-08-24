package fr.vandriessche.rallyeschema.coreservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.coreservice.controllers.TeamController;
import fr.vandriessche.rallyeschema.coreservice.entities.Team;

@Component
public class TeamModelAssembler implements SimpleRepresentationModelAssembler<Team> {

	@Override
	public void addLinks(@NonNull EntityModel<Team> resource) {
		Team content = resource.getContent();
		if (content == null) {
			return;
		}
		resource.add(linkTo(methodOn(TeamController.class).getTeam(content.getId(), null)).withSelfRel());
		resource.add(linkTo(methodOn(TeamController.class).getTeam(content.getId(), null)).withRel("team"));
	}

	@Override
	public void addLinks(@NonNull CollectionModel<EntityModel<Team>> resources) {
		// Pas de lien supplementaire pour la collection
	}
}
