package fr.vandriessche.rallyeschema.coreservice.controllers;

import fr.vandriessche.rallyeschema.coreservice.models.ChallengeGroupModel;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeGroupService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/challengeGroups")
public class ChallengeGroupController {

    private final ChallengeGroupService challengeGroupService;

    public ChallengeGroupController(ChallengeGroupService challengeGroupService) {
        this.challengeGroupService = challengeGroupService;
    }

    @GetMapping
    public List<ChallengeGroupModel> getAll() {
        return challengeGroupService.getAll();
    }

    @PostMapping
    public ChallengeGroupModel create(@RequestBody ChallengeGroupModel model) {
        return challengeGroupService.create(model);
    }

    @PutMapping("/{id}")
    public ChallengeGroupModel update(@PathVariable String id, @RequestBody ChallengeGroupModel model) {
        return challengeGroupService.update(id, model);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        challengeGroupService.delete(id);
    }
}
