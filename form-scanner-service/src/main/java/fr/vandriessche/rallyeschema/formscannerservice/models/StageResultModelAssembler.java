package fr.vandriessche.rallyeschema.formscannerservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.formscannerservice.controllers.ResponseFileController;
import fr.vandriessche.rallyeschema.formscannerservice.controllers.StageResultController;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileSource;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageResult;

@Component
public class StageResultModelAssembler implements SimpleRepresentationModelAssembler<StageResult> {

	@Override
	public void addLinks(EntityModel<StageResult> resource) {
		resource.add(linkTo(methodOn(StageResultController.class).getStageResult(resource.getContent().getId(), null))
				.withSelfRel());
		resource.add(linkTo(methodOn(StageResultController.class).getStageResult(resource.getContent().getId(), null))
				.withRel("stageResult"));
		resource.getContent().getResponseSources().forEach(source -> {
			if (source.getClass() == ResponseFileSource.class) {
				resource.add(linkTo(methodOn(ResponseFileController.class).getResponseFileInfo(source.getId(), null))
						.withRel("responseFiles"));
			}
		});
	}

	@Override
	public void addLinks(CollectionModel<EntityModel<StageResult>> resources) {
	}
}
