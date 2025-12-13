package fr.vandriessche.rallyeschema.responseservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.responseservice.controllers.TeamInfoController;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;

@Component
public class TeamInfoModelAssembler implements SimpleRepresentationModelAssembler<TeamInfo> {

	@Override
	public void addLinks(@NonNull EntityModel<TeamInfo> resource) {
		TeamInfo content = resource.getContent();
		if (content == null) {
			return;
		}
		resource.add(linkTo(methodOn(TeamInfoController.class).getTeamInfo(content.getId(), null)).withSelfRel());
		resource.add(linkTo(methodOn(TeamInfoController.class).getTeamInfo(content.getId(), null)).withRel("teamInfo"));
	}

	@Override
	public void addLinks(@NonNull CollectionModel<EntityModel<TeamInfo>> resources) {
		// Pas de lien supplementaire pour la collection
	}
}
