package fr.vandriessche.rallyeschema.responseservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.responseservice.controllers.TeamInfoController;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;

@Component
public class TeamInfoModelAssembler implements SimpleRepresentationModelAssembler<TeamInfo> {

	@Override
	public void addLinks(EntityModel<TeamInfo> resource) {
		resource.add(linkTo(methodOn(TeamInfoController.class).getTeamInfo(resource.getContent().getId(), null))
				.withSelfRel());
		resource.add(linkTo(methodOn(TeamInfoController.class).getTeamInfo(resource.getContent().getId(), null))
				.withRel("teamInfo"));
	}

	@Override
	public void addLinks(CollectionModel<EntityModel<TeamInfo>> resources) {
		// Pas de lien supplémentaire pour la collection
	}
}
