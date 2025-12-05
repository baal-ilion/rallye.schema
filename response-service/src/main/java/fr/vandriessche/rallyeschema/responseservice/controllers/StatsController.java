package fr.vandriessche.rallyeschema.responseservice.controllers;

import fr.vandriessche.rallyeschema.responseservice.stats.StatsService;
import fr.vandriessche.rallyeschema.responseservice.stats.dto.StatsResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin
@RequestMapping("/stats")
public class StatsController {

    private final StatsService statsService;
    private static final Logger LOGGER = LoggerFactory.getLogger(StatsController.class);

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping
    public StatsResponseDto getStats() {
        try {
            return statsService.computeStats();
        } catch (Exception ex) {
            LOGGER.error("Failed to compute stats", ex);
            return new StatsResponseDto();
        }
    }
}
