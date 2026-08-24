package fr.vandriessche.rallyeschema.coreservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.coreservice.controllers.SubmittedFormController;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;

@Component
public class SubmittedFormMetadataModelAssembler implements SimpleRepresentationModelAssembler<SubmittedFormMetadata> {
	@Override
	public void addLinks(@NonNull EntityModel<SubmittedFormMetadata> resource) {
		SubmittedFormMetadata content = resource.getContent();
		if (content == null) {
			return;
		}
		resource.add(linkTo(methodOn(SubmittedFormController.class).getSubmittedFormMetadata(content.getId(), null))
				.withSelfRel());
		resource.add(linkTo(methodOn(SubmittedFormController.class).getSubmittedFormMetadata(content.getId(), null))
				.withRel("submittedFormMetadata"));
		resource.add(linkTo(methodOn(SubmittedFormController.class).downloadFile(content.getId(), null))
				.withRel("submittedForm"));
		resource.add(linkTo(methodOn(SubmittedFormController.class).downloadThumbnail(content.getId(), null))
				.withRel("submittedFormThumbnail"));
		resource.add(linkTo(methodOn(SubmittedFormController.class).getSameSubmittedFormMetadatas(content.getId(), null))
				.withRel("same"));
	}

	@Override
	public void addLinks(@NonNull CollectionModel<EntityModel<SubmittedFormMetadata>> resources) {
		// Pas de lien supplementaire pour la collection
	}
}
