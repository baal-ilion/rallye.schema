package fr.vandriessche.rallyeschema.coreservice.services;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeGroup;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengePoint;
import fr.vandriessche.rallyeschema.coreservice.entities.Team;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.coreservice.models.GroupRankingEntry;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamRepository;

@Service
public class GroupRankingService {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamPointService teamPointService;

    @Autowired
    private ChallengeConfigurationRepository challengeConfigurationRepository;

    /**
     * Calcule le classement par groupes d'épreuves.
     *
     * On renvoie une liste de GroupRankingEntry, triée par :
     *  - nom du groupe
     *  - rang dans le groupe
     */
    public List<GroupRankingEntry> computeGroupRankings() {
        List<GroupRankingEntry> result = new ArrayList<>();

        // 1. Récupération des données de base
        List<Team> teams = teamRepository.findAll();
        // Recalcule les points pour garantir des valeurs à jour
        List<TeamPoint> teamPoints = teamPointService.computeTeamPoints();
        List<ChallengeConfiguration> challengeConfigurations = challengeConfigurationRepository.findAll();

        // Map team -> TeamPoint
        Map<Integer, TeamPoint> teamPointByTeam = new HashMap<>();
        for (TeamPoint tp : teamPoints) {
            if (tp.getTeam() != null) {
                teamPointByTeam.put(tp.getTeam(), tp);
            }
        }

        // 2. Construction des groupes : groupId -> set de challenges, groupId -> ChallengeGroup
        Map<String, Set<Integer>> challengesByGroupId = new HashMap<>();
        Map<String, ChallengeGroup> groupById = new HashMap<>();

        for (ChallengeConfiguration challengeConfiguration : challengeConfigurations) {
            if (challengeConfiguration.getGroup() != null && challengeConfiguration.getGroup().getId() != null) {
                ChallengeGroup group = challengeConfiguration.getGroup();
                String groupId = group.getId();
                groupById.put(groupId, group);
                challengesByGroupId
                        .computeIfAbsent(groupId, k -> new HashSet<>())
                        .add(challengeConfiguration.getChallenge());
            }
        }

        // 3. Pour chaque groupe, calcul des scores et des rangs
        for (Entry<String, Set<Integer>> entry : challengesByGroupId.entrySet()) {
            String groupId = entry.getKey();
            Set<Integer> groupChallenges = entry.getValue();
            ChallengeGroup group = groupById.get(groupId);
            String groupName = (group != null && group.getName() != null) ? group.getName() : groupId;

            // Liste temporaire des entrées pour ce groupe
            List<GroupRankingEntry> groupEntries = new ArrayList<>();

            for (Team team : teams) {
                Integer teamNumber = team.getTeam();
                if (teamNumber == null) {
                    continue;
                }

                TeamPoint tp = teamPointByTeam.get(teamNumber);
                long scoreGroup = 0L;

                if (tp != null && tp.getChallengePoints() != null) {
                    Map<Integer, ChallengePoint> challengePoints = tp.getChallengePoints();
                    for (Integer challengeNumber : groupChallenges) {
                        if (challengeNumber == null) {
                            continue;
                        }
                        ChallengePoint sp = challengePoints.get(challengeNumber);
                        if (sp != null) {
                            // On suppose que getTotal() est un long primitif ou non-null
                            scoreGroup += sp.getTotal();
                        }
                    }
                }

                boolean present = team.isPresent();

                GroupRankingEntry entryForTeam = new GroupRankingEntry(
                        groupId,
                        groupName,
                        teamNumber,
                        team.getName(),
                        scoreGroup,
                        null, // le rang sera attribué après le tri
                        present
                );
                groupEntries.add(entryForTeam);
            }

            // Tri des équipes du groupe : score décroissant, puis n° d'équipe croissant
            groupEntries.sort(
                    Comparator.comparing(GroupRankingEntry::getGroupScore, Comparator.nullsFirst(Comparator.reverseOrder()))
                              .thenComparing(GroupRankingEntry::getTeam)
            );

            // Attribution des rangs dans le groupe
            int rank = 1;
            for (GroupRankingEntry e : groupEntries) {
                e.setGroupRank(rank++);
                result.add(e);
            }
        }

        // 4. Tri global final : par nom du groupe (ordre alpha), puis rang
        result.sort(
                Comparator.comparing(GroupRankingEntry::getGroupName, (a, b) -> {
                            if (a == null && b == null) return 0;
                            if (a == null) return 1;
                            if (b == null) return -1;
                            return a.compareToIgnoreCase(b);
                        }
                ).thenComparing(GroupRankingEntry::getGroupRank)
        );

        return result;
    }
}
