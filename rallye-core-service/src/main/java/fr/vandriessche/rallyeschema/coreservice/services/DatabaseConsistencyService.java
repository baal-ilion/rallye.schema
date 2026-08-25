package fr.vandriessche.rallyeschema.coreservice.services;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedForm;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;
import fr.vandriessche.rallyeschema.coreservice.entities.FormReferenceImage;
import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormSource;
import fr.vandriessche.rallyeschema.coreservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengePoint;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResponse;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeRanking;
import fr.vandriessche.rallyeschema.coreservice.entities.Team;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.coreservice.models.ConsistencyIssue;
import fr.vandriessche.rallyeschema.coreservice.models.ConsistencyReport;
import lombok.extern.java.Log;

@Service
@Log
public class DatabaseConsistencyService {

    private static final String ISSUE_DUP_TEAM_NUMBER = "TEAM_DUP_NUMBER";
    private static final String ISSUE_DUP_TEAM_NAME = "TEAM_DUP_NAME";
    private static final String ISSUE_ORPHAN_CHALLENGE_RESULT_BY_TEAM = "ORPHAN_CHALLENGE_RESULT_BY_TEAM";
    private static final String ISSUE_ORPHAN_TEAM_POINT_BY_TEAM = "ORPHAN_TEAM_POINT_BY_TEAM";
    private static final String ISSUE_ORPHAN_CHALLENGE_RESULT_BY_CHALLENGE = "ORPHAN_CHALLENGE_RESULT_BY_CHALLENGE";
    private static final String ISSUE_ORPHAN_CHALLENGE_RESPONSE = "ORPHAN_CHALLENGE_RESPONSE";
    private static final String ISSUE_ORPHAN_CHALLENGE_RESPONSE_TEAM = "CHALLENGE_RESPONSE_ORPHAN_TEAM";
    private static final String ISSUE_ORPHAN_SUBMITTED_FORM_BY_CHALLENGE = "ORPHAN_SUBMITTED_FORM_BY_CHALLENGE";
    private static final String ISSUE_ORPHAN_CHALLENGE_RANKING = "ORPHAN_CHALLENGE_RANKING";
    private static final String ISSUE_ORPHAN_TEAM_POINT_BY_CHALLENGE = "ORPHAN_TEAM_POINT_BY_CHALLENGE";
    private static final String ISSUE_ORPHAN_SUBMITTED_FORM_BY_TEAM = "ORPHAN_SUBMITTED_FORM_BY_TEAM";
    private static final String ISSUE_SUBMITTED_FORM_MISSING_METADATA = "SUBMITTED_FORM_MISSING_METADATA";
    private static final String ISSUE_SUBMITTED_FORM_MISSING_BINARY = "SUBMITTED_FORM_MISSING_BINARY";
    private static final String ISSUE_CHECKED_SUBMITTED_FORM_NOT_SELECTED = "SUBMITTED_FORM_CHECKED_NOT_SELECTED";
    private static final String ISSUE_DUPLICATE_FORM_RECOGNITION_CONFIGURATION = "FORM_RECOGNITION_CONFIGURATION_DUPLICATE_CHALLENGE_PAGE";
    private static final String ISSUE_ORPHAN_FORM_DESIGN = "ORPHAN_FORM_DESIGN";

    @Autowired
    private MongoTemplate mongoTemplate;

    public ConsistencyReport analyze() {
        ConsistencyReport report = new ConsistencyReport();
        List<ConsistencyIssue> issues = new ArrayList<>();

        Map<Integer, List<Team>> teamsByNumber = mongoTemplate.findAll(Team.class).stream()
                .filter(t -> t.getTeam() != null)
                .collect(Collectors.groupingBy(Team::getTeam));
        Map<String, List<Team>> teamsByName = mongoTemplate.findAll(Team.class).stream()
                .filter(t -> t.getName() != null)
                .collect(Collectors.groupingBy(Team::getName));
        Set<Integer> knownTeams = new HashSet<>(teamsByNumber.keySet());
        Set<Integer> knownChallenges = getKnownChallenges();
        Set<String> knownChallengeConfigurationIds = mongoTemplate.findAll(ChallengeConfiguration.class).stream()
                .map(ChallengeConfiguration::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        addDuplicates(issues, ISSUE_DUP_TEAM_NUMBER, "Équipes avec le même numéro", teamsByNumber);
        addDuplicates(issues, ISSUE_DUP_TEAM_NAME, "Équipes avec le même nom", teamsByName);
        addFormRecognitionConfigurationDuplicates(issues);
        addOrphans(issues, ISSUE_ORPHAN_FORM_DESIGN,
                "Conceptions de formulaire rattachées à une épreuve inexistante",
                mongoTemplate.findAll(FormDesign.class).stream()
                        .filter(design -> !FormDesign.REFERENCE_ID.equals(design.getId()))
                        .filter(design -> design.getChallengeConfigurationId() == null
                                || !knownChallengeConfigurationIds.contains(design.getChallengeConfigurationId()))
                        .map(FormDesign::getId)
                        .collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_CHALLENGE_RESULT_BY_TEAM, "Scores sans équipe associée",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("team").exists(false),
                        Criteria.where("team").is(null),
                        Criteria.where("team").nin(knownTeams)
                )), ChallengeResult.class)
                        .stream().map(ChallengeResult::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_TEAM_POINT_BY_TEAM, "Classements sans équipe associée",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("team").exists(false),
                        Criteria.where("team").is(null),
                        Criteria.where("team").nin(knownTeams)
                )), TeamPoint.class)
                        .stream().map(TeamPoint::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_SUBMITTED_FORM_BY_TEAM, "Formulaires validés non attachés à une équipe",
                mongoTemplate.find(checkedSubmittedFormMetadataQuery(new Criteria().orOperator(
                        Criteria.where("team").exists(false),
                        Criteria.where("team").is(null),
                        Criteria.where("team").nin(knownTeams)
                )), SubmittedFormMetadata.class)
                        .stream().map(SubmittedFormMetadata::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_CHALLENGE_RESULT_BY_CHALLENGE, "Scores rattachés à une épreuve inexistante",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("challenge").exists(false),
                        Criteria.where("challenge").is(null),
                        Criteria.where("challenge").nin(knownChallenges)
                )), ChallengeResult.class).stream().map(ChallengeResult::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_CHALLENGE_RESPONSE, "Réponses saisies rattachées à une épreuve inexistante",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("challenge").exists(false),
                        Criteria.where("challenge").is(null),
                        Criteria.where("challenge").nin(knownChallenges)
                )), ChallengeResponse.class).stream().map(ChallengeResponse::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_CHALLENGE_RESPONSE_TEAM, "Réponses saisies rattachées à une équipe inexistante",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("team").exists(false),
                        Criteria.where("team").is(null),
                        Criteria.where("team").nin(knownTeams)
                )), ChallengeResponse.class).stream().map(ChallengeResponse::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_SUBMITTED_FORM_BY_CHALLENGE, "Formulaires validés liés à une épreuve inexistante",
                mongoTemplate.find(checkedSubmittedFormMetadataQuery(new Criteria().orOperator(
                        Criteria.where("challenge").exists(false),
                        Criteria.where("challenge").is(null),
                        Criteria.where("challenge").nin(knownChallenges)
                )), SubmittedFormMetadata.class).stream().map(SubmittedFormMetadata::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_CHALLENGE_RANKING, "Classements d'épreuve inexistante",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("challenge").exists(false),
                        Criteria.where("challenge").is(null),
                        Criteria.where("challenge").nin(knownChallenges)
                )), ChallengeRanking.class).stream().map(ChallengeRanking::getId).collect(Collectors.toList()));

        Set<String> submittedFormMetadataIds = mongoTemplate.findAll(SubmittedFormMetadata.class).stream()
                .map(SubmittedFormMetadata::getId).collect(Collectors.toSet());

        Query missingInfoQuery = Query.query(new Criteria().orOperator(
                Criteria.where("metadata").exists(false),
                Criteria.where("metadata").is(null),
                Criteria.where("metadata").nin(submittedFormMetadataIds)
        ));
        missingInfoQuery.fields().exclude("file");
        List<String> missingInfoIds = mongoTemplate.find(missingInfoQuery, SubmittedForm.class)
                .stream()
                .map(SubmittedForm::getId)
                .collect(Collectors.toList());
        addOrphans(issues, ISSUE_SUBMITTED_FORM_MISSING_METADATA, "Fichiers liés à un formulaire inexistant",
                missingInfoIds);

        Query missingFileQuery = Query.query(new Criteria().orOperator(
                Criteria.where("file").exists(false),
                Criteria.where("file").is(null)
        ));
        missingFileQuery.fields().include("_id");
        List<String> missingFileData = mongoTemplate.find(
                missingFileQuery,
                Document.class,
                mongoTemplate.getCollectionName(SubmittedForm.class))
                .stream()
                .map(doc -> String.valueOf(doc.get("_id")))
                .collect(Collectors.toList());
        addOrphans(issues, ISSUE_SUBMITTED_FORM_MISSING_BINARY, "Fichiers sans binaire (JPEG manquant)",
                missingFileData);

        Set<String> selectedSubmittedFormIds = mongoTemplate.findAll(ChallengeResult.class).stream()
                .filter(result -> result.getResponseSources() != null)
                .flatMap(result -> result.getResponseSources().stream())
                .filter(SubmittedFormSource.class::isInstance)
                .map(source -> source.getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<String> checkedButNotSelectedIds = mongoTemplate.find(
                        Query.query(Criteria.where("checked").is(true)), SubmittedFormMetadata.class).stream()
                .map(SubmittedFormMetadata::getId)
                .filter(Objects::nonNull)
                .filter(id -> !selectedSubmittedFormIds.contains(id))
                .collect(Collectors.toList());
        addOrphans(issues, ISSUE_CHECKED_SUBMITTED_FORM_NOT_SELECTED,
                "Formulaires marqués comme acceptés mais non utilisés par un résultat d'épreuve",
                checkedButNotSelectedIds);

        addOrphans(issues, ISSUE_ORPHAN_TEAM_POINT_BY_CHALLENGE, "Points d'équipe liés à une épreuve inexistante",
                findTeamPointsWithUnknownChallenges(knownChallenges));

        report.setIssues(issues);
        report.setRemaining(issues.stream().mapToLong(ConsistencyIssue::getCount).sum());
        return report;
    }

    public ConsistencyReport fixAutomatically() {
        return fixSelected(Set.of(
                ISSUE_DUP_TEAM_NUMBER,
                ISSUE_DUP_TEAM_NAME,
                ISSUE_ORPHAN_CHALLENGE_RESULT_BY_TEAM,
                ISSUE_ORPHAN_TEAM_POINT_BY_TEAM,
                ISSUE_ORPHAN_CHALLENGE_RESULT_BY_CHALLENGE,
                ISSUE_ORPHAN_CHALLENGE_RESPONSE,
                ISSUE_ORPHAN_CHALLENGE_RESPONSE_TEAM,
                ISSUE_ORPHAN_SUBMITTED_FORM_BY_CHALLENGE,
                ISSUE_ORPHAN_CHALLENGE_RANKING,
                ISSUE_ORPHAN_TEAM_POINT_BY_CHALLENGE,
                ISSUE_ORPHAN_SUBMITTED_FORM_BY_TEAM,
                ISSUE_SUBMITTED_FORM_MISSING_METADATA,
                ISSUE_SUBMITTED_FORM_MISSING_BINARY,
                ISSUE_CHECKED_SUBMITTED_FORM_NOT_SELECTED,
                ISSUE_DUPLICATE_FORM_RECOGNITION_CONFIGURATION,
                ISSUE_ORPHAN_FORM_DESIGN
        ));
    }

    public ConsistencyReport fixSelected(Set<String> codes) {
        ConsistencyReport report = analyze();
        long fixed = 0;
        Set<Integer> knownChallenges = getKnownChallenges();
        for (ConsistencyIssue issue : report.getIssues()) {
            if (!issue.isAutoFixable() || issue.getCount() == 0 || !codes.contains(issue.getCode())) {
                continue;
            }
            switch (issue.getCode()) {
                case ISSUE_DUP_TEAM_NUMBER:
                case ISSUE_DUP_TEAM_NAME:
                    fixed += ISSUE_DUP_TEAM_NUMBER.equals(issue.getCode())
                            ? deduplicateTeamsByKey(Team::getTeam)
                            : deduplicateTeamsByKey(Team::getName);
                    break;
                case ISSUE_ORPHAN_CHALLENGE_RESULT_BY_TEAM:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(ChallengeResult.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_TEAM_POINT_BY_TEAM:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(TeamPoint.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_SUBMITTED_FORM_BY_TEAM:
                    fixed += deleteSubmittedFormMetadatasByIds(issue.getIds());
                    break;
                case ISSUE_ORPHAN_CHALLENGE_RESULT_BY_CHALLENGE:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(ChallengeResult.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_CHALLENGE_RESPONSE:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(ChallengeResponse.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_CHALLENGE_RESPONSE_TEAM:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(ChallengeResponse.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_SUBMITTED_FORM_BY_CHALLENGE:
                    fixed += deleteSubmittedFormMetadatasByIds(issue.getIds());
                    break;
                case ISSUE_ORPHAN_CHALLENGE_RANKING:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(ChallengeRanking.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_TEAM_POINT_BY_CHALLENGE:
                    fixed += cleanTeamPointsWithUnknownChallenges(knownChallenges);
                    break;
                case ISSUE_SUBMITTED_FORM_MISSING_METADATA:
                case ISSUE_SUBMITTED_FORM_MISSING_BINARY:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(SubmittedForm.class), issue.getIds());
                    break;
                case ISSUE_CHECKED_SUBMITTED_FORM_NOT_SELECTED:
                    fixed += resetCheckedSubmittedFormMetadatas(issue.getIds());
                    break;
                case ISSUE_DUPLICATE_FORM_RECOGNITION_CONFIGURATION:
                    fixed += deduplicateFormRecognitionConfigurationsByChallengeAndPage();
                    break;
                case ISSUE_ORPHAN_FORM_DESIGN:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(FormDesign.class), issue.getIds());
                    break;
                default:
                    break;
            }
        }
        ConsistencyReport after = analyze();
        after.setAutoFixApplied(fixed);
        return after;
    }

    private <K, V extends Team> void addDuplicates(List<ConsistencyIssue> issues, String code, String description,
            Map<K, List<V>> grouped) {
        List<String> duplicateIds = grouped.values().stream()
                .filter(list -> list.size() > 1)
                .flatMap(List::stream)
                .map(Team::getId)
                .collect(Collectors.toList());
        if (!duplicateIds.isEmpty()) {
            issues.add(new ConsistencyIssue(code, description, duplicateIds.size(), duplicateIds, true,
                    sampleIds(duplicateIds)));
        }
    }

    private void addFormRecognitionConfigurationDuplicates(List<ConsistencyIssue> issues) {
        Map<String, List<FormRecognitionConfiguration>> grouped = mongoTemplate.findAll(FormRecognitionConfiguration.class).stream()
                .filter(configuration -> configuration.getChallenge() != null && configuration.getPage() != null)
                .collect(Collectors.groupingBy(this::formRecognitionConfigurationKey));
        List<String> duplicateIds = grouped.values().stream()
                .filter(list -> list.size() > 1)
                .flatMap(List::stream)
                .map(FormRecognitionConfiguration::getId)
                .collect(Collectors.toList());
        if (!duplicateIds.isEmpty()) {
            issues.add(new ConsistencyIssue(ISSUE_DUPLICATE_FORM_RECOGNITION_CONFIGURATION,
                    "Modèles de formulaire en doublon pour la même épreuve/page", duplicateIds.size(), duplicateIds,
                    true, sampleFormRecognitionConfigurationDuplicates(grouped)));
        }
    }

    private void addOrphans(List<ConsistencyIssue> issues, String code, String description, List<String> ids) {
        if (!ids.isEmpty()) {
            issues.add(new ConsistencyIssue(code, description, ids.size(), ids, true, sampleIds(ids)));
        }
    }

    private String sampleIds(List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return "";
        }
        int limit = Math.min(ids.size(), 5);
        List<String> sample = ids.subList(0, limit);
        String suffix = ids.size() > limit ? " …" : "";
        return "Exemples : " + String.join(", ", sample) + suffix;
    }

    private String sampleFormRecognitionConfigurationDuplicates(Map<String, List<FormRecognitionConfiguration>> grouped) {
        List<String> samples = grouped.values().stream()
                .filter(list -> list.size() > 1)
                .limit(5)
                .map(list -> {
                    FormRecognitionConfiguration first = list.get(0);
                    String ids = list.stream().map(FormRecognitionConfiguration::getId).collect(Collectors.joining(", "));
                    return "épreuve " + first.getChallenge() + " page " + first.getPage() + " : " + ids;
                })
                .collect(Collectors.toList());
        return "Exemples : " + String.join(" ; ", samples);
    }

    private String formRecognitionConfigurationKey(FormRecognitionConfiguration formRecognitionConfiguration) {
        return formRecognitionConfiguration.getChallenge() + "/" + formRecognitionConfiguration.getPage();
    }

    private long deduplicateTeamsByKey(java.util.function.Function<Team, ?> keyExtractor) {
        Map<Object, List<Team>> grouped = mongoTemplate.findAll(Team.class).stream()
                .filter(t -> keyExtractor.apply(t) != null)
                .collect(Collectors.groupingBy(keyExtractor));
        long deleted = 0;
        for (var entry : grouped.entrySet()) {
            List<Team> list = entry.getValue();
            if (list.size() <= 1) {
                continue;
            }
            List<String> ids = list.stream().map(Team::getId).collect(Collectors.toList());
            List<String> toDelete = ids.subList(1, ids.size());
            deleted += deleteByIds(mongoTemplate.getCollectionName(Team.class), toDelete);
        }
        return deleted;
    }

    private long deduplicateFormRecognitionConfigurationsByChallengeAndPage() {
        Map<String, List<FormRecognitionConfiguration>> grouped = mongoTemplate.findAll(FormRecognitionConfiguration.class).stream()
                .filter(configuration -> configuration.getChallenge() != null && configuration.getPage() != null)
                .collect(Collectors.groupingBy(this::formRecognitionConfigurationKey));
        long deleted = 0;
        for (List<FormRecognitionConfiguration> list : grouped.values()) {
            if (list.size() <= 1) {
                continue;
            }
            FormRecognitionConfiguration kept = selectFormRecognitionConfigurationToKeep(list);
            List<String> toDelete = list.stream()
                    .map(FormRecognitionConfiguration::getId)
                    .filter(id -> !Objects.equals(id, kept.getId()))
                    .collect(Collectors.toList());
            deleted += deleteByIds(mongoTemplate.getCollectionName(FormRecognitionConfiguration.class), toDelete);
            deleteByIds(mongoTemplate.getCollectionName(FormReferenceImage.class), toDelete);
            attachFormRecognitionConfigurationToChallenge(kept);
        }
        return deleted;
    }

    private FormRecognitionConfiguration selectFormRecognitionConfigurationToKeep(List<FormRecognitionConfiguration> duplicates) {
        FormRecognitionConfiguration first = duplicates.get(0);
        ChallengeConfiguration challengeConfiguration = mongoTemplate.findOne(Query.query(Criteria.where("challenge").is(first.getChallenge())),
                ChallengeConfiguration.class);
        if (challengeConfiguration != null && challengeConfiguration.getFormRecognitionConfigurations() != null) {
            for (FormRecognitionConfiguration referenced : challengeConfiguration.getFormRecognitionConfigurations()) {
                if (!Objects.equals(referenced.getPage(), first.getPage())) {
                    continue;
                }
                for (FormRecognitionConfiguration duplicate : duplicates) {
                    if (Objects.equals(duplicate.getId(), referenced.getId())) {
                        return duplicate;
                    }
                }
            }
        }
        return duplicates.stream()
                .min(Comparator.comparing(FormRecognitionConfiguration::getId, Comparator.nullsLast(String::compareTo)))
                .orElse(first);
    }

    private void attachFormRecognitionConfigurationToChallenge(FormRecognitionConfiguration kept) {
        ChallengeConfiguration challengeConfiguration = mongoTemplate.findOne(Query.query(Criteria.where("challenge").is(kept.getChallenge())),
                ChallengeConfiguration.class);
        if (challengeConfiguration == null || challengeConfiguration.getFormRecognitionConfigurations() == null) {
            return;
        }
        challengeConfiguration.getFormRecognitionConfigurations().removeIf(configuration -> Objects.equals(configuration.getPage(), kept.getPage()));
        challengeConfiguration.getFormRecognitionConfigurations().add(kept);
        challengeConfiguration.getFormRecognitionConfigurations()
                .sort(Comparator.comparing(FormRecognitionConfiguration::getPage, Comparator.nullsLast(Integer::compareTo)));
        mongoTemplate.save(challengeConfiguration);
    }

    private Query checkedSubmittedFormMetadataQuery(Criteria orphanCriteria) {
        return Query.query(new Criteria().andOperator(
                Criteria.where("checked").is(true),
                orphanCriteria
        ));
    }

    private long deleteSubmittedFormMetadatasByIds(List<String> ids) {
        long deletedInfos = deleteByIds(mongoTemplate.getCollectionName(SubmittedFormMetadata.class), ids);
        deleteByIds(mongoTemplate.getCollectionName(SubmittedForm.class), ids);
        return deletedInfos;
    }

    private long resetCheckedSubmittedFormMetadatas(List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        List<Object> finalIds = ids.stream().map(this::toIdValue).collect(Collectors.toList());
        return mongoTemplate.updateMulti(
                Query.query(Criteria.where("_id").in(finalIds).and("checked").is(true)),
                new org.springframework.data.mongodb.core.query.Update().set("checked", false),
                SubmittedFormMetadata.class).getModifiedCount();
    }

    private long deleteByIds(String collectionName, List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        List<Object> finalIds = ids.stream().map(this::toIdValue).collect(Collectors.toList());
        return mongoTemplate.remove(Query.query(Criteria.where("_id").in(finalIds)), collectionName).getDeletedCount();
    }

    private Object toIdValue(String id) {
        try {
            return new org.bson.types.ObjectId(id);
        } catch (IllegalArgumentException ex) {
            return id;
        }
    }

    private Set<Integer> getKnownChallenges() {
        return mongoTemplate.findAll(ChallengeConfiguration.class).stream()
                .map(ChallengeConfiguration::getChallenge)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private List<String> findTeamPointsWithUnknownChallenges(Set<Integer> knownChallenges) {
        List<String> ids = new ArrayList<>();
        Query query = new Query();
        query.fields().include("_id").include("challengePoints");
        List<Document> docs = mongoTemplate.find(query, Document.class, mongoTemplate.getCollectionName(TeamPoint.class));
        for (Document doc : docs) {
            Document challengePoints = doc.get("challengePoints", Document.class);
            if (challengePoints == null) {
                continue;
            }
            boolean hasUnknownChallenge = challengePoints.keySet().stream().anyMatch(k -> {
                try {
                    return !knownChallenges.contains(Integer.valueOf(k));
                } catch (NumberFormatException e) {
                    return true;
                }
            });
            if (hasUnknownChallenge) {
                ids.add(String.valueOf(doc.get("_id")));
            }
        }
        return ids;
    }

    private long cleanTeamPointsWithUnknownChallenges(Set<Integer> knownChallenges) {
        List<TeamPoint> teamPoints = mongoTemplate.findAll(TeamPoint.class);
        long removed = 0;
        for (TeamPoint tp : teamPoints) {
            if (tp.getChallengePoints() == null) {
                continue;
            }
            Map<Integer, ChallengePoint> cleaned = new HashMap<>(tp.getChallengePoints());
            List<Integer> toRemove = cleaned.keySet().stream()
                    .filter(challenge -> challenge == null || !knownChallenges.contains(challenge))
                    .collect(Collectors.toList());
            if (!toRemove.isEmpty()) {
                toRemove.forEach(cleaned::remove);
                tp.setChallengePoints(cleaned);
                tp.setTotal(cleaned.values().stream().map(ChallengePoint::getTotal).reduce(0L, Long::sum));
                mongoTemplate.save(tp);
                removed += toRemove.size();
            }
        }
        return removed;
    }
}
