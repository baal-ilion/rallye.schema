package fr.vandriessche.rallyeschema.coreservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.coreservice.controllers.ChallengeResponseController;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;

@Component
public class ChallengeResponseModelAssembler implements SimpleRepresentationModelAssembler<ChallengeResponse> {
	@Override
	public void addLinks(@NonNull EntityModel<ChallengeResponse> resource) {
		ChallengeResponse content = resource.getContent();
		if (content == null) {
			return;
		}
		resource.add(linkTo(methodOn(ChallengeResponseController.class).getChallengeResponse(content.getId(), null))
				.withSelfRel());
		resource.add(linkTo(methodOn(ChallengeResponseController.class).getChallengeResponse(content.getId(), null))
				.withRel("challengeResponse"));
	}

	@Override
	public void addLinks(@NonNull CollectionModel<EntityModel<ChallengeResponse>> resources) {
		// Pas de lien supplementaire pour la collection
	}
}
