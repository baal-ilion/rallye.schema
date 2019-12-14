package fr.vandriessche.rallyeschema.formscannerservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.formscannerservice.controllers.TeamInfoController;
import fr.vandriessche.rallyeschema.formscannerservice.entities.TeamInfo;

@Component
public class TeamInfoModelAssembler implements SimpleRepresentationModelAssembler<TeamInfo> {

	@Override
	public void addLinks(EntityModel<TeamInfo> resource) {
		// TODO Stub de la méthode généré automatiquement
		resource.add(linkTo(methodOn(TeamInfoController.class).getTeamInfo(resource.getContent().getId(), null))
				.withSelfRel());
		resource.add(linkTo(methodOn(TeamInfoController.class).getTeamInfo(resource.getContent().getId(), null))
				.withRel("teamInfo"));
	}

	@Override
	public void addLinks(CollectionModel<EntityModel<TeamInfo>> resources) {
		// TODO Stub de la méthode généré automatiquement

	}
}
