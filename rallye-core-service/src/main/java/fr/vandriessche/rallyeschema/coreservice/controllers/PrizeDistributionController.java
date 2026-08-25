package fr.vandriessche.rallyeschema.coreservice.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.coreservice.models.PrizeDistributionResult;
import fr.vandriessche.rallyeschema.coreservice.services.PrizeDistributionService;

@RestController
public class PrizeDistributionController {

    @Autowired
    private PrizeDistributionService prizeDistributionService;

    /**
     * Endpoint principal : distribution des lots.
     */
    @GetMapping("/prizes")
    public PrizeDistributionResult getPrizes() {
        return prizeDistributionService.computeCurrentDistribution();
    }

}
