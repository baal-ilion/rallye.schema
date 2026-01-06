package fr.vandriessche.rallyeschema.responseservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.responseservice.controllers.ResponseFileParamController;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileParam;

@Component
public class ResponseFileParamModelAssembler implements SimpleRepresentationModelAssembler<ResponseFileParam> {

	@Override
	public void addLinks(@NonNull EntityModel<ResponseFileParam> resource) {
		ResponseFileParam content = resource.getContent();
		if (content == null) {
			return;
		}
		resource.add(linkTo(methodOn(ResponseFileParamController.class).getResponseFileParam(content.getId(), null))
				.withSelfRel());
		resource.add(linkTo(methodOn(ResponseFileParamController.class).getResponseFileParam(content.getId(), null))
				.withRel("responseFileParam"));
		resource.add(linkTo(methodOn(ResponseFileParamController.class).downloadResponseFileTemplate(content.getId()))
				.withRel("responseFileTemplate"));
		resource.add(linkTo(methodOn(ResponseFileParamController.class).downloadResponseFileModel(content.getId()))
				.withRel("responseFileModel"));
	}

	@Override
	public void addLinks(@NonNull CollectionModel<EntityModel<ResponseFileParam>> resources) {
		// Pas de lien supplementaire pour la collection
	}
}
