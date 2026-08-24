package fr.vandriessche.rallyeschema.coreservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.coreservice.controllers.FormRecognitionConfigurationController;
import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;

@Component
public class FormRecognitionConfigurationModelAssembler implements SimpleRepresentationModelAssembler<FormRecognitionConfiguration> {

	@Override
	public void addLinks(@NonNull EntityModel<FormRecognitionConfiguration> resource) {
		FormRecognitionConfiguration content = resource.getContent();
		if (content == null) {
			return;
		}
		resource.add(linkTo(methodOn(FormRecognitionConfigurationController.class).getFormRecognitionConfiguration(content.getId(), null))
				.withSelfRel());
		resource.add(linkTo(methodOn(FormRecognitionConfigurationController.class).getFormRecognitionConfiguration(content.getId(), null))
				.withRel("formRecognitionConfiguration"));
		resource.add(linkTo(methodOn(FormRecognitionConfigurationController.class).downloadSubmittedFormTemplate(content.getId()))
				.withRel("submittedFormTemplate"));
		resource.add(linkTo(methodOn(FormRecognitionConfigurationController.class).downloadFormReferenceImage(content.getId()))
				.withRel("formReferenceImage"));
	}

	@Override
	public void addLinks(@NonNull CollectionModel<EntityModel<FormRecognitionConfiguration>> resources) {
		// Pas de lien supplementaire pour la collection
	}
}
