package fr.vandriessche.rallyeschema.coreservice.controllers;

import fr.vandriessche.rallyeschema.coreservice.statistics.StatisticsService;
import fr.vandriessche.rallyeschema.coreservice.statistics.dto.StatisticsResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin
@RequestMapping("/statistics")
public class StatisticsController {

    private final StatisticsService statisticsService;
    private static final Logger LOGGER = LoggerFactory.getLogger(StatisticsController.class);

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping
    public StatisticsResponseDto getStatistics() {
        try {
            return statisticsService.computeStats();
        } catch (Exception ex) {
            LOGGER.error("Failed to compute statistics", ex);
            return new StatisticsResponseDto();
        }
    }
}
