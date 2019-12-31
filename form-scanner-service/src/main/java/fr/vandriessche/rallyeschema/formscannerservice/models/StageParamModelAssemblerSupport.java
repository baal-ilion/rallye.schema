package fr.vandriessche.rallyeschema.formscannerservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.server.mvc.RepresentationModelAssemblerSupport;

import fr.vandriessche.rallyeschema.formscannerservice.controllers.ResponseFileParamController;
import fr.vandriessche.rallyeschema.formscannerservice.controllers.StageParamController;
import fr.vandriessche.rallyeschema.formscannerservice.entities.StageParam;

public class StageParamModelAssemblerSupport extends RepresentationModelAssemblerSupport<StageParam, StageParamModel> {
	public StageParamModelAssemblerSupport() {
		super(StageParamController.class, StageParamModel.class);

	}

	@Override
	public CollectionModel<StageParamModel> toCollectionModel(Iterable<? extends StageParam> entities) {
		var collectionModel = super.toCollectionModel(entities);
		addLinks(collectionModel);
		return collectionModel;
	}

	@Override
	public StageParamModel toModel(StageParam entity) {
		StageParamModel model = super.createModelWithId(entity.getId(), entity);
		model.setId(entity.getId());
		model.setName(entity.getName());
		model.setInactive(entity.getInactive());
		model.setStage(entity.getStage());
		model.setQuestionParams(entity.getQuestionParams());
		model.setQuestionPointParams(entity.getQuestionPointParams());
		addLinks(model, entity);
		return model;
	}

	private void addLinks(CollectionModel<StageParamModel> resources) {
	}

	private void addLinks(StageParamModel resource, StageParam entity) {
		resource.add(linkTo(methodOn(StageParamController.class).getStageParam(resource.getId(), null))
				.withRel("stageParam"));
		entity.getResponseFileParams().forEach(responceFileParam -> resource.add(linkTo(
				methodOn(ResponseFileParamController.class).getResponseFileParam(responceFileParam.getId(), null))
						.withRel("responseFileParams")));
	}
}
