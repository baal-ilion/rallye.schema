package fr.vandriessche.rallyeschema.responseservice.services;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Comparator;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.vandriessche.rallyeschema.responseservice.entities.StageGroup;
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.models.StageGroupModel;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageGroupRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageParamRepository;

@Service
public class StageGroupService {

    private final StageGroupRepository stageGroupRepository;
    private final StageParamRepository stageParamRepository;

    public StageGroupService(StageGroupRepository stageGroupRepository,
                             StageParamRepository stageParamRepository) {
        this.stageGroupRepository = stageGroupRepository;
        this.stageParamRepository = stageParamRepository;
    }

public List<StageGroupModel> getAll() {
    return stageGroupRepository.findAll()
            .stream()
            .sorted(Comparator.comparing(StageGroup::getName, String.CASE_INSENSITIVE_ORDER))
            .map(this::toModel)
            .collect(Collectors.toList());
    }

    public StageGroupModel create(StageGroupModel model) {
        StageGroup entity = new StageGroup();
        apply(model, entity);
        return toModel(stageGroupRepository.save(entity));
    }

    public StageGroupModel update(String id, StageGroupModel model) {
        StageGroup entity = stageGroupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("StageGroup not found"));
        apply(model, entity);
        return toModel(stageGroupRepository.save(entity));
    }

    @Transactional
    public void delete(String id) {
        StageGroup group = stageGroupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("StageGroup not found"));

        // DÉTACHER les épreuves AVANT suppression du groupe
        List<StageParam> stages = stageParamRepository.findByGroup(group);
        for (StageParam stage : stages) {
            stage.setGroup(null);
            stageParamRepository.save(stage);
        }

        stageGroupRepository.delete(group);
    }

    private StageGroupModel toModel(StageGroup entity) {
        StageGroupModel model = new StageGroupModel();
        model.setId(entity.getId());
        model.setName(entity.getName());
        model.setDescription(entity.getDescription());
        return model;
    }

    private void apply(StageGroupModel model, StageGroup entity) {
        entity.setName(model.getName());
        entity.setDescription(model.getDescription());
    }
}
