package fr.vandriessche.rallyeschema.responseservice.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.vandriessche.rallyeschema.responseservice.models.PrizeDistributionResult;
import fr.vandriessche.rallyeschema.responseservice.services.PrizeDistributionService;

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

    /**
     * Ancien endpoint conservé pour compatibilité éventuelle.
     * Tu pourras le supprimer plus tard si tu veux.
     */
    @GetMapping("/prizeDistribution")
    public PrizeDistributionResult getPrizeDistribution() {
        return prizeDistributionService.computeCurrentDistribution();
    }
}
