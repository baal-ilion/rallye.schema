package fr.vandriessche.rallyeschema.coreservice.services;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeGroup;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengePoint;
import fr.vandriessche.rallyeschema.coreservice.entities.Team;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.coreservice.models.PrizeAssignment;
import fr.vandriessche.rallyeschema.coreservice.models.PrizeDistributionResult;
import fr.vandriessche.rallyeschema.coreservice.models.PrizeType;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamRepository;

@Service
public class PrizeDistributionService {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamPointService teamPointService;

    @Autowired
    private ChallengeConfigurationRepository challengeConfigurationRepository;

    /**
     * Candidat pour un lot de groupe (interne au service)
     */
    private static class GroupCandidate {
        private final String groupId;
        private final String groupName;
        private final Integer team;
        private final String teamName;
        private final Long groupScore;
        private final Integer groupRank;
        private final boolean present;

        public GroupCandidate(String groupId, String groupName, Integer team, String teamName,
                              Long groupScore, Integer groupRank, boolean present) {
            this.groupId = groupId;
            this.groupName = groupName;
            this.team = team;
            this.teamName = teamName;
            this.groupScore = groupScore;
            this.groupRank = groupRank;
            this.present = present;
        }

        public String getGroupId() {
            return groupId;
        }

        public String getGroupName() {
            return groupName;
        }

        public Integer getTeam() {
            return team;
        }

        public String getTeamName() {
            return teamName;
        }

        public Long getGroupScore() {
            return groupScore;
        }

        public Integer getGroupRank() {
            return groupRank;
        }

        public boolean isPresent() {
            return present;
        }
    }

    /**
     * Candidat pour le classement général (interne au service)
     */
    private static class GeneralCandidate {
        private final Integer team;
        private final String teamName;
        private final Long score;
        private final boolean present;
        private Integer rank;

        public GeneralCandidate(Integer team, String teamName, Long score, boolean present) {
            this.team = team;
            this.teamName = teamName;
            this.score = score;
            this.present = present;
        }

        public Integer getTeam() {
            return team;
        }

        public String getTeamName() {
            return teamName;
        }

        public Long getScore() {
            return score;
        }

        public boolean isPresent() {
            return present;
        }

        public Integer getRank() {
            return rank;
        }

        public void setRank(Integer rank) {
            this.rank = rank;
        }
    }

    /**
     * Calcule la distribution des lots en fonction :
     * - des scores généraux
     * - des scores par groupes d'épreuves
     * - de la présence des équipes
     */
    public PrizeDistributionResult computeCurrentDistribution() {
        PrizeDistributionResult result = new PrizeDistributionResult();

        // 1. Récupération des données de base
        List<Team> teams = teamRepository.findAll();

        // Recalcule les points pour partir du dernier état
        List<TeamPoint> teamPoints = teamPointService.computeTeamPoints();
        Map<Integer, TeamPoint> teamPointByTeam = teamPoints.stream()
                .filter(tp -> tp.getTeam() != null)
                .collect(Collectors.toMap(TeamPoint::getTeam, tp -> tp, (a, b) -> a));

        List<ChallengeConfiguration> challengeConfigurations = challengeConfigurationRepository.findAll();

        // 2. Construction des groupes : groupId -> challenges, groupId -> ChallengeGroup
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

        // 3. Construction du classement général complet (toutes les équipes)
        List<GeneralCandidate> generalCandidates = new ArrayList<>();
        for (Team team : teams) {
            Integer teamNumber = team.getTeam();
            if (teamNumber == null) {
                continue;
            }
            TeamPoint tp = teamPointByTeam.get(teamNumber);
            long total = (tp != null) ? tp.getTotal() : 0L; // total est très probablement un long primitif
            Long score = total;
            boolean present = team.isPresent(); // <- IMPORTANT : isPresent() et pas getPresent()
            generalCandidates.add(new GeneralCandidate(teamNumber, team.getName(), score, present));
        }

        generalCandidates.sort(Comparator
                .comparing(GeneralCandidate::getScore, Comparator.nullsFirst(Comparator.reverseOrder()))
                .thenComparing(GeneralCandidate::getTeam, Comparator.nullsFirst(Comparator.naturalOrder())));

        int rank = 1;
        for (GeneralCandidate c : generalCandidates) {
            c.setRank(rank++);
        }

        // 4. Attribution du lot général : meilleure équipe présente
        Optional<GeneralCandidate> generalWinnerOpt = generalCandidates.stream()
                .filter(GeneralCandidate::isPresent)
                .findFirst();

        Set<Integer> teamsWithAnyPrize = new HashSet<>();
        if (generalWinnerOpt.isPresent()) {
            GeneralCandidate gw = generalWinnerOpt.get();
            PrizeAssignment general = new PrizeAssignment(
                    PrizeType.GENERAL,
                    null,
                    null,
                    gw.getTeam(),
                    gw.getTeamName(),
                    gw.getScore(),
                    gw.getRank()
            );
            result.setGeneralPrize(general);
            teamsWithAnyPrize.add(gw.getTeam());
        }

        // 5. Construction des candidats par groupe (classement complet, avec info de présence)
        Map<String, List<GroupCandidate>> candidatesByGroup = new HashMap<>();

        for (Entry<String, Set<Integer>> entry : challengesByGroupId.entrySet()) {
            String groupId = entry.getKey();
            Set<Integer> groupChallenges = entry.getValue();
            ChallengeGroup group = groupById.get(groupId);
            String groupName = (group != null) ? group.getName() : groupId;

            List<GroupCandidate> groupCandidates = new ArrayList<>();

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
                        ChallengePoint sp = challengePoints.get(challengeNumber);
                        if (sp != null) {
                            // On suppose que sp.getTotal() est un long primitif ou non-null
                            scoreGroup += sp.getTotal();
                        }
                    }
                }

                boolean present = team.isPresent(); // <- IMPORTANT : isPresent()
                groupCandidates.add(new GroupCandidate(
                        groupId,
                        groupName,
                        teamNumber,
                        team.getName(),
                        scoreGroup,
                        null, // rang renseigné après tri
                        present
                ));
            }

            // Tri par score décroissant puis n° d'équipe
            groupCandidates.sort(Comparator
                    .comparing(GroupCandidate::getGroupScore, Comparator.nullsFirst(Comparator.reverseOrder()))
                    .thenComparing(GroupCandidate::getTeam, Comparator.nullsFirst(Comparator.naturalOrder())));

            // Attribution des rangs
            int groupRank = 1;
            List<GroupCandidate> rankedCandidates = new ArrayList<>();
            for (GroupCandidate c : groupCandidates) {
                rankedCandidates.add(new GroupCandidate(
                        c.getGroupId(),
                        c.getGroupName(),
                        c.getTeam(),
                        c.getTeamName(),
                        c.getGroupScore(),
                        groupRank++,
                        c.isPresent()
                ));
            }

            candidatesByGroup.put(groupId, rankedCandidates);
        }

        // 6. Étape 1 : essayer de donner un lot de groupe à un max d'équipes différentes
        List<GroupCandidate> allCandidatesPresent = candidatesByGroup.values().stream()
                .flatMap(List::stream)
                .filter(GroupCandidate::isPresent)
                .collect(Collectors.toList());

        allCandidatesPresent.sort(
                Comparator.comparing(GroupCandidate::getGroupRank)
                        .thenComparing(GroupCandidate::getGroupScore, Comparator.nullsFirst(Comparator.reverseOrder()))
        );

        Set<String> groupsWithPrize = new HashSet<>();
        Set<Integer> teamsWithGroupPrize = new HashSet<>();

        for (GroupCandidate candidate : allCandidatesPresent) {
            if (groupsWithPrize.contains(candidate.getGroupId())) {
                continue;
            }
            if (teamsWithGroupPrize.contains(candidate.getTeam())) {
                continue;
            }

            PrizeAssignment assignment = new PrizeAssignment(
                    PrizeType.GROUP,
                    candidate.getGroupId(),
                    candidate.getGroupName(),
                    candidate.getTeam(),
                    candidate.getTeamName(),
                    candidate.getGroupScore(),
                    candidate.getGroupRank()
            );
            result.addGroupPrize(assignment);
            groupsWithPrize.add(candidate.getGroupId());
            teamsWithGroupPrize.add(candidate.getTeam());
            teamsWithAnyPrize.add(candidate.getTeam());
        }

        // 7. Étape 2 : pour les groupes restants, autoriser le cumul de lots
        for (Entry<String, ChallengeGroup> entry : groupById.entrySet()) {
            String groupId = entry.getKey();
            ChallengeGroup group = entry.getValue();
            String groupName = (group != null) ? group.getName() : groupId;

            if (groupsWithPrize.contains(groupId)) {
                continue; // déjà un gagnant
            }

            List<GroupCandidate> groupCandidates = candidatesByGroup.get(groupId);
            if (groupCandidates == null || groupCandidates.isEmpty()) {
                continue;
            }

            Optional<GroupCandidate> winnerOpt = groupCandidates.stream()
                    .filter(GroupCandidate::isPresent)
                    .findFirst();

            if (winnerOpt.isPresent()) {
                GroupCandidate candidate = winnerOpt.get();

                // Même si l'équipe a déjà un lot, on autorise (cas particuliers)
                PrizeAssignment assignment = new PrizeAssignment(
                        PrizeType.GROUP,
                        groupId,
                        groupName,
                        candidate.getTeam(),
                        candidate.getTeamName(),
                        candidate.getGroupScore(),
                        candidate.getGroupRank()
                );
                result.addGroupPrize(assignment);
                groupsWithPrize.add(groupId);
                teamsWithAnyPrize.add(candidate.getTeam());
            }
            // Si aucune équipe présente : pas de lot pour ce groupe
        }

        return result;
    }
}
