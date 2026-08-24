package fr.vandriessche.rallyeschema.coreservice.models;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.server.mvc.RepresentationModelAssemblerSupport;
import org.springframework.lang.NonNull;

import fr.vandriessche.rallyeschema.coreservice.controllers.FormRecognitionConfigurationController;
import fr.vandriessche.rallyeschema.coreservice.controllers.ChallengeConfigurationController;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;

public class ChallengeConfigurationModelAssemblerSupport
        extends RepresentationModelAssemblerSupport<ChallengeConfiguration, ChallengeConfigurationModel> {

    public ChallengeConfigurationModelAssemblerSupport() {
        super(ChallengeConfigurationController.class, ChallengeConfigurationModel.class);
    }

    @Override
    public @NonNull ChallengeConfigurationModel toModel(@NonNull ChallengeConfiguration entity) {
        ChallengeConfigurationModel model = instantiateModel(entity);

        model.setId(entity.getId());
        model.setVersion(entity.getVersion());
        model.setChallenge(entity.getChallenge());
        model.setName(entity.getName());
        model.setGroup(entity.getGroup());

        // 🔹 Champs "simples" pour info (optionnels)
        if (entity.getGroup() != null) {
            model.setGroupId(entity.getGroup().getId());
            model.setGroupName(entity.getGroup().getName());
        }

        model.setQuestionScorings(entity.getQuestionScorings());
        model.setPerformanceScorings(entity.getPerformanceScorings());
        model.setQuestionDefinitions(entity.getQuestionDefinitions());

        addLinks(model, entity);
        return model;
    }

    @Override
    public @NonNull CollectionModel<ChallengeConfigurationModel> toCollectionModel(@NonNull Iterable<? extends ChallengeConfiguration> entities) {
        CollectionModel<ChallengeConfigurationModel> resources = super.toCollectionModel(entities);
        addLinks(resources);
        return resources;
    }

    private void addLinks(CollectionModel<ChallengeConfigurationModel> resources) {
        // Pas de lien supplémentaire pour la collection
    }

    private void addLinks(ChallengeConfigurationModel resource, ChallengeConfiguration entity) {
        resource.add(linkTo(methodOn(ChallengeConfigurationController.class)
                .getChallengeConfiguration(resource.getId(), null)).withRel("challengeConfiguration"));

        entity.getFormRecognitionConfigurations().forEach(formRecognitionConfiguration ->
                resource.add(linkTo(methodOn(FormRecognitionConfigurationController.class)
                        .getFormRecognitionConfiguration(formRecognitionConfiguration.getId(), null))
                        .withRel("formRecognitionConfigurations")));
    }
}
