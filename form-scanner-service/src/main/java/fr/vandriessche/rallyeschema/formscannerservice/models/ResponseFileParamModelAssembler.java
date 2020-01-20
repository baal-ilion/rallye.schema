package fr.vandriessche.rallyeschema.formscannerservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.formscannerservice.controllers.ResponseFileParamController;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileParam;

@Component
public class ResponseFileParamModelAssembler implements SimpleRepresentationModelAssembler<ResponseFileParam> {

	@Override
	public void addLinks(EntityModel<ResponseFileParam> resource) {
		resource.add(linkTo(
				methodOn(ResponseFileParamController.class).getResponseFileParam(resource.getContent().getId(), null))
						.withSelfRel());
		resource.add(linkTo(
				methodOn(ResponseFileParamController.class).getResponseFileParam(resource.getContent().getId(), null))
						.withRel("responseFileParam"));
		resource.add(linkTo(
				methodOn(ResponseFileParamController.class).downloadResponseFileTemplate(resource.getContent().getId()))
						.withRel("responseFileTemplate"));
		resource.add(linkTo(
				methodOn(ResponseFileParamController.class).downloadResponseFileModel(resource.getContent().getId()))
						.withRel("responseFileModel"));
	}

	@Override
	public void addLinks(CollectionModel<EntityModel<ResponseFileParam>> resources) {
		// Pas de lien supplémentaire pour la collection
	}
}
