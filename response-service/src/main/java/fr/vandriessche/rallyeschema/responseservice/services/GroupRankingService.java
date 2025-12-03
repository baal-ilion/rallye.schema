package fr.vandriessche.rallyeschema.responseservice.services;

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

import fr.vandriessche.rallyeschema.responseservice.entities.StageGroup;
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StagePoint;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.responseservice.models.GroupRankingEntry;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamInfoRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamPointRepository;

@Service
public class GroupRankingService {

    @Autowired
    private TeamInfoRepository teamInfoRepository;

    @Autowired
    private TeamPointRepository teamPointRepository;

    @Autowired
    private TeamPointService teamPointService;

    @Autowired
    private StageParamRepository stageParamRepository;

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
        List<TeamInfo> teamInfos = teamInfoRepository.findAll();
        // Recalcule les points pour garantir des valeurs à jour
        List<TeamPoint> teamPoints = teamPointService.computeTeamPoints();
        List<StageParam> stageParams = stageParamRepository.findAll();

        // Map team -> TeamPoint
        Map<Integer, TeamPoint> teamPointByTeam = new HashMap<>();
        for (TeamPoint tp : teamPoints) {
            if (tp.getTeam() != null) {
                teamPointByTeam.put(tp.getTeam(), tp);
            }
        }

        // 2. Construction des groupes : groupId -> set de stages, groupId -> StageGroup
        Map<String, Set<Integer>> stagesByGroupId = new HashMap<>();
        Map<String, StageGroup> groupById = new HashMap<>();

        for (StageParam stageParam : stageParams) {
            if (stageParam.getGroup() != null && stageParam.getGroup().getId() != null) {
                StageGroup group = stageParam.getGroup();
                String groupId = group.getId();
                groupById.put(groupId, group);
                stagesByGroupId
                        .computeIfAbsent(groupId, k -> new HashSet<>())
                        .add(stageParam.getStage());
            }
        }

        // 3. Pour chaque groupe, calcul des scores et des rangs
        for (Entry<String, Set<Integer>> entry : stagesByGroupId.entrySet()) {
            String groupId = entry.getKey();
            Set<Integer> groupStages = entry.getValue();
            StageGroup group = groupById.get(groupId);
            String groupName = (group != null && group.getName() != null) ? group.getName() : groupId;

            // Liste temporaire des entrées pour ce groupe
            List<GroupRankingEntry> groupEntries = new ArrayList<>();

            for (TeamInfo info : teamInfos) {
                Integer teamNumber = info.getTeam();
                if (teamNumber == null) {
                    continue;
                }

                TeamPoint tp = teamPointByTeam.get(teamNumber);
                long scoreGroup = 0L;

                if (tp != null && tp.getStagePoints() != null) {
                    Map<Integer, StagePoint> stagePoints = tp.getStagePoints();
                    for (Integer stageNumber : groupStages) {
                        if (stageNumber == null) {
                            continue;
                        }
                        StagePoint sp = stagePoints.get(stageNumber);
                        if (sp != null) {
                            // On suppose que getTotal() est un long primitif ou non-null
                            scoreGroup += sp.getTotal();
                        }
                    }
                }

                boolean present = info.isPresent();

                GroupRankingEntry entryForTeam = new GroupRankingEntry(
                        groupId,
                        groupName,
                        teamNumber,
                        info.getName(),
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
