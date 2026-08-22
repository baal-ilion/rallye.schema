package fr.vandriessche.rallyeschema.responseservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.responseservice.controllers.ResponseFileController;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;

@Component
public class ResponseFileInfoModelAssembler implements SimpleRepresentationModelAssembler<ResponseFileInfo> {
	@Override
	public void addLinks(@NonNull EntityModel<ResponseFileInfo> resource) {
		ResponseFileInfo content = resource.getContent();
		if (content == null) {
			return;
		}
		resource.add(linkTo(methodOn(ResponseFileController.class).getResponseFileInfo(content.getId(), null))
				.withSelfRel());
		resource.add(linkTo(methodOn(ResponseFileController.class).getResponseFileInfo(content.getId(), null))
				.withRel("responseFileInfo"));
		resource.add(linkTo(methodOn(ResponseFileController.class).downloadFile(content.getId(), null))
				.withRel("responseFile"));
		resource.add(linkTo(methodOn(ResponseFileController.class).downloadThumbnail(content.getId(), null))
				.withRel("responseFileThumbnail"));
		resource.add(linkTo(methodOn(ResponseFileController.class).getSameResponseFileInfos(content.getId(), null))
				.withRel("same"));
	}

	@Override
	public void addLinks(@NonNull CollectionModel<EntityModel<ResponseFileInfo>> resources) {
		// Pas de lien supplementaire pour la collection
	}
}
