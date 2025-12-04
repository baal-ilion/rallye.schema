package fr.vandriessche.rallyeschema.responseservice.controllers;

import fr.vandriessche.rallyeschema.responseservice.models.StageGroupModel;
import fr.vandriessche.rallyeschema.responseservice.services.StageGroupService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/stageGroups")
public class StageGroupController {

    private final StageGroupService stageGroupService;

    public StageGroupController(StageGroupService stageGroupService) {
        this.stageGroupService = stageGroupService;
    }

    @GetMapping
    public List<StageGroupModel> getAll() {
        return stageGroupService.getAll();
    }

    @PostMapping
    public StageGroupModel create(@RequestBody StageGroupModel model) {
        return stageGroupService.create(model);
    }

    @PutMapping("/{id}")
    public StageGroupModel update(@PathVariable String id, @RequestBody StageGroupModel model) {
        return stageGroupService.update(id, model);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        stageGroupService.delete(id);
    }
}
