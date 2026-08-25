package fr.vandriessche.rallyeschema.coreservice.services;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Comparator;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeGroup;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.models.ChallengeGroupModel;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeGroupRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;

@Service
public class ChallengeGroupService {

    private final ChallengeGroupRepository challengeGroupRepository;
    private final ChallengeConfigurationRepository challengeConfigurationRepository;

    public ChallengeGroupService(ChallengeGroupRepository challengeGroupRepository,
                             ChallengeConfigurationRepository challengeConfigurationRepository) {
        this.challengeGroupRepository = challengeGroupRepository;
        this.challengeConfigurationRepository = challengeConfigurationRepository;
    }

public List<ChallengeGroupModel> getAll() {
    return challengeGroupRepository.findAll()
            .stream()
            .sorted(Comparator.comparing(ChallengeGroup::getName, String.CASE_INSENSITIVE_ORDER))
            .map(this::toModel)
            .collect(Collectors.toList());
    }

    public ChallengeGroupModel create(ChallengeGroupModel model) {
        ChallengeGroup entity = new ChallengeGroup();
        apply(model, entity);
        return toModel(challengeGroupRepository.save(entity));
    }

    public ChallengeGroupModel update(String id, ChallengeGroupModel model) {
        ChallengeGroup entity = challengeGroupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ChallengeGroup not found"));
        apply(model, entity);
        return toModel(challengeGroupRepository.save(entity));
    }

    @Transactional
    public void delete(String id) {
        ChallengeGroup group = challengeGroupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ChallengeGroup not found"));

        // DÉTACHER les épreuves AVANT suppression du groupe
        List<ChallengeConfiguration> challenges = challengeConfigurationRepository.findByGroup(group);
        for (ChallengeConfiguration challenge : challenges) {
            challenge.setGroup(null);
            challengeConfigurationRepository.save(challenge);
        }

        challengeGroupRepository.delete(group);
    }

    private ChallengeGroupModel toModel(ChallengeGroup entity) {
        ChallengeGroupModel model = new ChallengeGroupModel();
        model.setId(entity.getId());
        model.setName(entity.getName());
        return model;
    }

    private void apply(ChallengeGroupModel model, ChallengeGroup entity) {
        entity.setName(model.getName());
    }
}
