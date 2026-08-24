package fr.vandriessche.rallyeschema.coreservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import java.util.Objects;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.coreservice.controllers.SubmittedFormController;
import fr.vandriessche.rallyeschema.coreservice.controllers.ChallengeResultController;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormSource;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;

@Component
public class ChallengeResultModelAssembler implements SimpleRepresentationModelAssembler<ChallengeResult> {

	@Override
	public void addLinks(@NonNull EntityModel<ChallengeResult> resource) {
		ChallengeResult content = resource.getContent();
		if (content == null) {
			return;
		}
		resource.add(linkTo(methodOn(ChallengeResultController.class).getChallengeResult(content.getId(), null))
				.withSelfRel());
		resource.add(linkTo(methodOn(ChallengeResultController.class).getChallengeResult(content.getId(), null))
				.withRel("challengeResult"));
		if (Objects.nonNull(content.getResponseSources())) {
			content.getResponseSources().forEach(source -> {
				if (source.getClass() == SubmittedFormSource.class) {
					resource.add(linkTo(methodOn(SubmittedFormController.class).getSubmittedFormMetadata(source.getId(), null))
							.withRel("submittedForms"));
				}
			});
		}
	}

	@Override
	public void addLinks(@NonNull CollectionModel<EntityModel<ChallengeResult>> resources) {
		// Pas de lien supplementaire pour la collection
	}
}
