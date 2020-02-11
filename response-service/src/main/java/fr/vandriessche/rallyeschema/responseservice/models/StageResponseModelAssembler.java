package fr.vandriessche.rallyeschema.responseservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.responseservice.controllers.StageResponseController;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResponse;

@Component
public class StageResponseModelAssembler implements SimpleRepresentationModelAssembler<StageResponse> {
	@Override
	public void addLinks(EntityModel<StageResponse> resource) {
		resource.add(
				linkTo(methodOn(StageResponseController.class).getStageResponse(resource.getContent().getId(), null))
						.withSelfRel());
		resource.add(
				linkTo(methodOn(StageResponseController.class).getStageResponse(resource.getContent().getId(), null))
						.withRel("stageResponse"));
	}

	@Override
	public void addLinks(CollectionModel<EntityModel<StageResponse>> resources) {
		// Pas de lien supplémentaire pour la collection
	}
}
