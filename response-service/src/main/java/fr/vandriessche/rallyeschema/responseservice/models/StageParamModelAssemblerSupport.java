package fr.vandriessche.rallyeschema.responseservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.server.mvc.RepresentationModelAssemblerSupport;

import fr.vandriessche.rallyeschema.responseservice.controllers.ResponseFileParamController;
import fr.vandriessche.rallyeschema.responseservice.controllers.StageParamController;
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;

public class StageParamModelAssemblerSupport
        extends RepresentationModelAssemblerSupport<StageParam, StageParamModel> {

    public StageParamModelAssemblerSupport() {
        super(StageParamController.class, StageParamModel.class);
    }

    @Override
    public StageParamModel toModel(StageParam entity) {
        StageParamModel model = instantiateModel(entity);

        model.setId(entity.getId());
        model.setStage(entity.getStage());
        model.setName(entity.getName());
        model.setGroup(entity.getGroup());

        // 🔹 Champs "simples" pour info (optionnels)
        if (entity.getGroup() != null) {
            model.setGroupId(entity.getGroup().getId());
            model.setGroupName(entity.getGroup().getName());
        }

        model.setQuestionPointParams(entity.getQuestionPointParams());
        model.setPerformancePointParams(entity.getPerformancePointParams());
        model.setQuestionParams(entity.getQuestionParams());

        addLinks(model, entity);
        return model;
    }

    @Override
    public CollectionModel<StageParamModel> toCollectionModel(Iterable<? extends StageParam> entities) {
        CollectionModel<StageParamModel> resources = super.toCollectionModel(entities);
        addLinks(resources);
        return resources;
    }

    private void addLinks(CollectionModel<StageParamModel> resources) {
        // Pas de lien supplémentaire pour la collection
    }

    private void addLinks(StageParamModel resource, StageParam entity) {
        resource.add(linkTo(methodOn(StageParamController.class)
                .getStageParam(resource.getId(), null)).withRel("stageParam"));

        entity.getResponseFileParams().forEach(responseFileParam ->
                resource.add(linkTo(methodOn(ResponseFileParamController.class)
                        .getResponseFileParam(responseFileParam.getId(), null))
                        .withRel("responseFileParams")));
    }
}
