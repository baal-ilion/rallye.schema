package fr.vandriessche.rallyeschema.responseservice.services;

import java.util.ArrayList;
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

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFile;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StagePoint;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResponse;
import fr.vandriessche.rallyeschema.responseservice.entities.StageRanking;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamPoint;
import fr.vandriessche.rallyeschema.responseservice.models.ConsistencyIssue;
import fr.vandriessche.rallyeschema.responseservice.models.ConsistencyReport;
import lombok.extern.java.Log;

@Service
@Log
public class DatabaseConsistencyService {

    private static final String ISSUE_DUP_TEAM_NUMBER = "TEAM_DUP_NUMBER";
    private static final String ISSUE_DUP_TEAM_NAME = "TEAM_DUP_NAME";
    private static final String ISSUE_ORPHAN_STAGE_RESULT = "STAGE_RESULT_ORPHAN_TEAM";
    private static final String ISSUE_ORPHAN_TEAM_POINT = "TEAM_POINT_ORPHAN_TEAM";
    private static final String ISSUE_ORPHAN_STAGE_RESULT_STAGE = "STAGE_RESULT_ORPHAN_STAGE";
    private static final String ISSUE_ORPHAN_STAGE_RESPONSE_STAGE = "STAGE_RESPONSE_ORPHAN_STAGE";
    private static final String ISSUE_ORPHAN_STAGE_RESPONSE_TEAM = "STAGE_RESPONSE_ORPHAN_TEAM";
    private static final String ISSUE_ORPHAN_RESPONSE_FILE_INFO_STAGE = "RESPONSE_FILE_INFO_ORPHAN_STAGE";
    private static final String ISSUE_ORPHAN_STAGE_RANKING = "STAGE_RANKING_ORPHAN_STAGE";
    private static final String ISSUE_TEAM_POINT_ORPHAN_STAGE = "TEAM_POINT_ORPHAN_STAGE";
    private static final String ISSUE_ORPHAN_RESPONSE_FILE_INFO = "RESPONSE_FILE_INFO_ORPHAN_TEAM";
    private static final String ISSUE_RESPONSE_FILE_MISSING_INFO = "RESPONSE_FILE_MISSING_INFO";
    private static final String ISSUE_RESPONSE_FILE_MISSING_FILE = "RESPONSE_FILE_MISSING_FILE";

    @Autowired
    private MongoTemplate mongoTemplate;

    public ConsistencyReport analyze() {
        ConsistencyReport report = new ConsistencyReport();
        List<ConsistencyIssue> issues = new ArrayList<>();

        Map<Integer, List<TeamInfo>> teamsByNumber = mongoTemplate.findAll(TeamInfo.class).stream()
                .filter(t -> t.getTeam() != null)
                .collect(Collectors.groupingBy(TeamInfo::getTeam));
        Map<String, List<TeamInfo>> teamsByName = mongoTemplate.findAll(TeamInfo.class).stream()
                .filter(t -> t.getName() != null)
                .collect(Collectors.groupingBy(TeamInfo::getName));
        Set<Integer> knownTeams = new HashSet<>(teamsByNumber.keySet());
        Set<Integer> knownStages = getKnownStages();

        addDuplicates(issues, ISSUE_DUP_TEAM_NUMBER, "Équipes avec le même numéro", teamsByNumber);
        addDuplicates(issues, ISSUE_DUP_TEAM_NAME, "Équipes avec le même nom", teamsByName);

        addOrphans(issues, ISSUE_ORPHAN_STAGE_RESULT, "Scores sans équipe associée",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("team").exists(false),
                        Criteria.where("team").is(null),
                        Criteria.where("team").nin(knownTeams)
                )), StageResult.class)
                        .stream().map(StageResult::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_TEAM_POINT, "Classements sans équipe associée",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("team").exists(false),
                        Criteria.where("team").is(null),
                        Criteria.where("team").nin(knownTeams)
                )), TeamPoint.class)
                        .stream().map(TeamPoint::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_RESPONSE_FILE_INFO, "Formulaires non attachés à une équipe",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("team").exists(false),
                        Criteria.where("team").is(null),
                        Criteria.where("team").nin(knownTeams)
                )), ResponseFileInfo.class)
                        .stream().map(ResponseFileInfo::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_STAGE_RESULT_STAGE, "Scores rattachés à une épreuve inexistante",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("stage").exists(false),
                        Criteria.where("stage").is(null),
                        Criteria.where("stage").nin(knownStages)
                )), StageResult.class).stream().map(StageResult::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_STAGE_RESPONSE_STAGE, "Réponses saisies rattachées à une épreuve inexistante",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("stage").exists(false),
                        Criteria.where("stage").is(null),
                        Criteria.where("stage").nin(knownStages)
                )), StageResponse.class).stream().map(StageResponse::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_STAGE_RESPONSE_TEAM, "Réponses saisies rattachées à une équipe inexistante",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("team").exists(false),
                        Criteria.where("team").is(null),
                        Criteria.where("team").nin(knownTeams)
                )), StageResponse.class).stream().map(StageResponse::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_RESPONSE_FILE_INFO_STAGE, "Formulaires liés à une épreuve inexistante",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("stage").exists(false),
                        Criteria.where("stage").is(null),
                        Criteria.where("stage").nin(knownStages)
                )), ResponseFileInfo.class).stream().map(ResponseFileInfo::getId).collect(Collectors.toList()));

        addOrphans(issues, ISSUE_ORPHAN_STAGE_RANKING, "Classements d'épreuve inexistante",
                mongoTemplate.find(Query.query(new Criteria().orOperator(
                        Criteria.where("stage").exists(false),
                        Criteria.where("stage").is(null),
                        Criteria.where("stage").nin(knownStages)
                )), StageRanking.class).stream().map(StageRanking::getId).collect(Collectors.toList()));

        Set<String> responseFileInfoIds = mongoTemplate.findAll(ResponseFileInfo.class).stream()
                .map(ResponseFileInfo::getId).collect(Collectors.toSet());

        Query missingInfoQuery = Query.query(new Criteria().orOperator(
                Criteria.where("info").exists(false),
                Criteria.where("info").is(null),
                Criteria.where("info").nin(responseFileInfoIds)
        ));
        missingInfoQuery.fields().exclude("file");
        List<String> missingInfoIds = mongoTemplate.find(missingInfoQuery, ResponseFile.class)
                .stream()
                .map(ResponseFile::getId)
                .collect(Collectors.toList());
        addOrphans(issues, ISSUE_RESPONSE_FILE_MISSING_INFO, "Fichiers liés à un formulaire inexistant",
                missingInfoIds);

        Query missingFileQuery = Query.query(new Criteria().orOperator(
                Criteria.where("file").exists(false),
                Criteria.where("file").is(null)
        ));
        missingFileQuery.fields().include("_id");
        List<String> missingFileData = mongoTemplate.find(
                missingFileQuery,
                Document.class,
                mongoTemplate.getCollectionName(ResponseFile.class))
                .stream()
                .map(doc -> String.valueOf(doc.get("_id")))
                .collect(Collectors.toList());
        addOrphans(issues, ISSUE_RESPONSE_FILE_MISSING_FILE, "Fichiers sans binaire (JPEG manquant)",
                missingFileData);

        addOrphans(issues, ISSUE_TEAM_POINT_ORPHAN_STAGE, "Points d'équipe liés à une épreuve inexistante",
                findTeamPointsWithUnknownStages(knownStages));

        report.setIssues(issues);
        report.setRemaining(issues.stream().mapToLong(ConsistencyIssue::getCount).sum());
        return report;
    }

    public ConsistencyReport fixAutomatically() {
        return fixSelected(Set.of(
                ISSUE_DUP_TEAM_NUMBER,
                ISSUE_DUP_TEAM_NAME,
                ISSUE_ORPHAN_STAGE_RESULT,
                ISSUE_ORPHAN_TEAM_POINT,
                ISSUE_ORPHAN_STAGE_RESULT_STAGE,
                ISSUE_ORPHAN_STAGE_RESPONSE_STAGE,
                ISSUE_ORPHAN_STAGE_RESPONSE_TEAM,
                ISSUE_ORPHAN_RESPONSE_FILE_INFO_STAGE,
                ISSUE_ORPHAN_STAGE_RANKING,
                ISSUE_TEAM_POINT_ORPHAN_STAGE,
                ISSUE_ORPHAN_RESPONSE_FILE_INFO,
                ISSUE_RESPONSE_FILE_MISSING_INFO,
                ISSUE_RESPONSE_FILE_MISSING_FILE
        ));
    }

    public ConsistencyReport fixSelected(Set<String> codes) {
        ConsistencyReport report = analyze();
        long fixed = 0;
        Set<Integer> knownStages = getKnownStages();
        for (ConsistencyIssue issue : report.getIssues()) {
            if (!issue.isAutoFixable() || issue.getCount() == 0 || !codes.contains(issue.getCode())) {
                continue;
            }
            switch (issue.getCode()) {
                case ISSUE_DUP_TEAM_NUMBER:
                case ISSUE_DUP_TEAM_NAME:
                    fixed += ISSUE_DUP_TEAM_NUMBER.equals(issue.getCode())
                            ? deduplicateTeamsByKey(TeamInfo::getTeam)
                            : deduplicateTeamsByKey(TeamInfo::getName);
                    break;
                case ISSUE_ORPHAN_STAGE_RESULT:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(StageResult.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_TEAM_POINT:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(TeamPoint.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_RESPONSE_FILE_INFO:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(ResponseFileInfo.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_STAGE_RESULT_STAGE:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(StageResult.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_STAGE_RESPONSE_STAGE:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(StageResponse.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_STAGE_RESPONSE_TEAM:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(StageResponse.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_RESPONSE_FILE_INFO_STAGE:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(ResponseFileInfo.class), issue.getIds());
                    break;
                case ISSUE_ORPHAN_STAGE_RANKING:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(StageRanking.class), issue.getIds());
                    break;
                case ISSUE_TEAM_POINT_ORPHAN_STAGE:
                    fixed += cleanTeamPointsWithUnknownStages(knownStages);
                    break;
                case ISSUE_RESPONSE_FILE_MISSING_INFO:
                case ISSUE_RESPONSE_FILE_MISSING_FILE:
                    fixed += deleteByIds(mongoTemplate.getCollectionName(ResponseFile.class), issue.getIds());
                    break;
                default:
                    break;
            }
        }
        ConsistencyReport after = analyze();
        after.setAutoFixApplied(fixed);
        return after;
    }

    private <K, V extends TeamInfo> void addDuplicates(List<ConsistencyIssue> issues, String code, String description,
            Map<K, List<V>> grouped) {
        List<String> duplicateIds = grouped.values().stream()
                .filter(list -> list.size() > 1)
                .flatMap(List::stream)
                .map(TeamInfo::getId)
                .collect(Collectors.toList());
        if (!duplicateIds.isEmpty()) {
            issues.add(new ConsistencyIssue(code, description, duplicateIds.size(), duplicateIds, true,
                    sampleIds(duplicateIds)));
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

    private long deduplicateTeamsByKey(java.util.function.Function<TeamInfo, ?> keyExtractor) {
        Map<Object, List<TeamInfo>> grouped = mongoTemplate.findAll(TeamInfo.class).stream()
                .filter(t -> keyExtractor.apply(t) != null)
                .collect(Collectors.groupingBy(keyExtractor));
        long deleted = 0;
        for (var entry : grouped.entrySet()) {
            List<TeamInfo> list = entry.getValue();
            if (list.size() <= 1) {
                continue;
            }
            List<String> ids = list.stream().map(TeamInfo::getId).collect(Collectors.toList());
            List<String> toDelete = ids.subList(1, ids.size());
            deleted += deleteByIds(mongoTemplate.getCollectionName(TeamInfo.class), toDelete);
        }
        return deleted;
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

    private Set<Integer> getKnownStages() {
        return mongoTemplate.findAll(StageParam.class).stream()
                .map(StageParam::getStage)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private List<String> findTeamPointsWithUnknownStages(Set<Integer> knownStages) {
        List<String> ids = new ArrayList<>();
        Query query = new Query();
        query.fields().include("_id").include("stagePoints");
        List<Document> docs = mongoTemplate.find(query, Document.class, mongoTemplate.getCollectionName(TeamPoint.class));
        for (Document doc : docs) {
            Document stagePoints = doc.get("stagePoints", Document.class);
            if (stagePoints == null) {
                continue;
            }
            boolean hasUnknownStage = stagePoints.keySet().stream().anyMatch(k -> {
                try {
                    return !knownStages.contains(Integer.valueOf(k));
                } catch (NumberFormatException e) {
                    return true;
                }
            });
            if (hasUnknownStage) {
                ids.add(String.valueOf(doc.get("_id")));
            }
        }
        return ids;
    }

    private long cleanTeamPointsWithUnknownStages(Set<Integer> knownStages) {
        List<TeamPoint> teamPoints = mongoTemplate.findAll(TeamPoint.class);
        long removed = 0;
        for (TeamPoint tp : teamPoints) {
            if (tp.getStagePoints() == null) {
                continue;
            }
            Map<Integer, StagePoint> cleaned = new HashMap<>(tp.getStagePoints());
            List<Integer> toRemove = cleaned.keySet().stream()
                    .filter(stage -> stage == null || !knownStages.contains(stage))
                    .collect(Collectors.toList());
            if (!toRemove.isEmpty()) {
                toRemove.forEach(cleaned::remove);
                tp.setStagePoints(cleaned);
                tp.setTotal(cleaned.values().stream().map(StagePoint::getTotal).reduce(0L, Long::sum));
                mongoTemplate.save(tp);
                removed += toRemove.size();
            }
        }
        return removed;
    }
}
