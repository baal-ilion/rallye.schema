package fr.vandriessche.rallyeschema.responseservice.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.responseservice.models.GroupRankingEntry;
import fr.vandriessche.rallyeschema.responseservice.services.GroupRankingService;

@RestController
public class GroupRankingController {

    @Autowired
    private GroupRankingService groupRankingService;

    @GetMapping("/groupRankings")
    public List<GroupRankingEntry> getGroupRankings() {
        return groupRankingService.computeGroupRankings();
    }
}
