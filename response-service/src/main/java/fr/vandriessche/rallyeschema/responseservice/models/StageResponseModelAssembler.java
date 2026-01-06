package fr.vandriessche.rallyeschema.responseservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.responseservice.controllers.StageResponseController;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResponse;

@Component
public class StageResponseModelAssembler implements SimpleRepresentationModelAssembler<StageResponse> {
	@Override
	public void addLinks(@NonNull EntityModel<StageResponse> resource) {
		StageResponse content = resource.getContent();
		if (content == null) {
			return;
		}
		resource.add(linkTo(methodOn(StageResponseController.class).getStageResponse(content.getId(), null))
				.withSelfRel());
		resource.add(linkTo(methodOn(StageResponseController.class).getStageResponse(content.getId(), null))
				.withRel("stageResponse"));
	}

	@Override
	public void addLinks(@NonNull CollectionModel<EntityModel<StageResponse>> resources) {
		// Pas de lien supplementaire pour la collection
	}
}
