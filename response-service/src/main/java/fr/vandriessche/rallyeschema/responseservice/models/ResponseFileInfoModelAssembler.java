package fr.vandriessche.rallyeschema.responseservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.responseservice.controllers.ResponseFileController;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;

@Component
public class ResponseFileInfoModelAssembler implements SimpleRepresentationModelAssembler<ResponseFileInfo> {
	@Override
	public void addLinks(EntityModel<ResponseFileInfo> resource) {
		resource.add(
				linkTo(methodOn(ResponseFileController.class).getResponseFileInfo(resource.getContent().getId(), null))
						.withSelfRel());
		resource.add(
				linkTo(methodOn(ResponseFileController.class).getResponseFileInfo(resource.getContent().getId(), null))
						.withRel("responseFileInfo"));
		resource.add(linkTo(methodOn(ResponseFileController.class).downloadFile(resource.getContent().getId(), null))
				.withRel("responseFile"));
		resource.add(linkTo(
				methodOn(ResponseFileController.class).getSameResponseFileInfos(resource.getContent().getId(), null))
						.withRel("same"));
	}

	@Override
	public void addLinks(CollectionModel<EntityModel<ResponseFileInfo>> resources) {
		// Pas de lien supplémentaire pour la collection
	}
}
