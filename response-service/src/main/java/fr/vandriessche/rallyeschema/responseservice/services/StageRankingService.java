package fr.vandriessche.rallyeschema.responseservice.services;

import static org.springframework.data.mongodb.core.aggregation.Aggregation.group;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.match;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.newAggregation;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.project;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.sort;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.unwind;

import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.ArrayOperators.ArrayToObject;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import com.mongodb.BasicDBObject;

import fr.vandriessche.rallyeschema.responseservice.entities.StageRanking;
import fr.vandriessche.rallyeschema.responseservice.entities.StageResult;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamRank;
import fr.vandriessche.rallyeschema.responseservice.message.StageRankingMessage;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageRankingRepository;
import lombok.extern.java.Log;

@Service
@Log
public class StageRankingService {
	public static final String STAGE_RANKING_CREATE_EVENT = "stageRanking.create";
	public static final String STAGE_RANKING_UPDATE_EVENT = "stageRanking.update";
	public static final String STAGE_RANKING_DELETE_EVENT = "stageRanking.delete";

	private static <T> void computeRanking(List<TeamRank<T>> ranks) {
		int rank = 1;
		T value = null;
		int idx = 1;
		for (var iterator = ranks.iterator(); iterator.hasNext();) {
			TeamRank<T> teamRank = iterator.next();
			if (value == null || !value.equals(teamRank.getValue())) {
				rank = idx;
				value = teamRank.getValue();
			}
			teamRank.setUpRank(rank);
			++idx;
		}
		value = null;
		idx = 1;
		for (var iterator = ranks.listIterator(ranks.size()); iterator.hasPrevious();) {
			TeamRank<T> teamRank = iterator.previous();
			if (value == null || !value.equals(teamRank.getValue())) {
				rank = idx;
				value = teamRank.getValue();
			}
			teamRank.setDownRank(rank);
			++idx;
		}
	}
	@Autowired
	private StageRankingRepository stageRankingRepository;

	@Autowired
	private MongoTemplate mongoTemplate;
	@Autowired
	private StageParamService stageParamService;

	@Autowired
	private MessageProducerService messageProducerService;

	public void computeAllStageRanking() {
		stageParamService.getStageParams().forEach(stageParam -> computeStageRanking(stageParam.getStage()));
	}

	public StageRanking computeStageRanking(Integer stage) {
		StageRanking stageRanking = findOrMakeStageRankingByStage(stage);
		if (stageRanking == null)
			return null;
		computeBegins(stageRanking);
		computeEnds(stageRanking);
		computePerformances(stageRanking);
		return save(stageRanking);
	}

	public StageRanking getStageRankingByStage(Integer stage) {
		return findOrMakeStageRankingByStage(stage);
	}

	private void computeBegins(StageRanking stageRanking) {
		/*
		 * [{ "$match" : { "$and" : [{ "begin" : { "$exists" : true}}, { "begin" : {
		 * "$ne" : null}}, { "stage" : ...}, { "checked" : true}]}}, { "$project" : {
		 * "stage" : 1, "team" : 1, "begin" : 1}}, { "$sort" : { "stage" : 1, "begin" :
		 * 1, "team" : 1}}, { "$group" : { "_id" : "$stage", "_begins" : { "$push" : {
		 * "team" : "$team", "value" : "$begin"}}}}, { "$project" : { "_id" : 0, "stage"
		 * : "$_id", "begins" : "$_begins"}}]
		 */
		Aggregation agg = newAggregation(
				match(new Criteria().andOperator(Criteria.where("begin").exists(true), Criteria.where("begin").ne(null),
						Criteria.where("stage").is(stageRanking.getStage()), Criteria.where("checked").is(true))),
				project("stage", "team", "begin"),
				sort(org.springframework.data.domain.Sort.Direction.ASC, "stage", "begin", "team"),
				group("stage").push(new BasicDBObject("team", "$team").append("value", "$begin")).as("_begins"),
				project().andExclude("_id").and("_id").as("stage").and("_begins").as("begins"));

		var results = mongoTemplate.aggregate(agg, StageResult.class, StageRanking.class);
		results.getMappedResults().stream().filter(o -> o.getStage().equals(stageRanking.getStage())).findFirst()
				.ifPresentOrElse(result -> stageRanking.setBegins(result.getBegins()),
						() -> stageRanking.getBegins().clear());

		computeRanking(stageRanking.getBegins());
	}

	private void computeEnds(StageRanking stageRanking) {
		/*
		 * [{ "$match" : { "$and" : [{ "end" : { "$exists" : true}}, { "end" : { "$ne" :
		 * null}}, { "stage" : ...}, { "checked" : true}]}}, { "$project" : { "stage" :
		 * 1, "team" : 1, "end" : 1}}, { "$sort" : { "stage" : 1, "end" : 1, "team" :
		 * 1}}, { "$group" : { "_id" : "$stage", "_ends" : { "$push" : { "team" :
		 * "$team", "value" : "$end"}}}}, { "$project" : { "_id" : 0, "stage" : "$_id",
		 * "ends" : "$_ends"}}]
		 */
		Aggregation agg = newAggregation(
				match(new Criteria().andOperator(Criteria.where("end").exists(true), Criteria.where("end").ne(null),
						Criteria.where("stage").is(stageRanking.getStage()), Criteria.where("checked").is(true))),
				project("stage", "team", "end"),
				sort(org.springframework.data.domain.Sort.Direction.ASC, "stage", "end", "team"),
				group("stage").push(new BasicDBObject("team", "$team").append("value", "$end")).as("_ends"),
				project().andExclude("_id").and("_id").as("stage").and("_ends").as("ends"));

		var results = mongoTemplate.aggregate(agg, StageResult.class, StageRanking.class);
		results.getMappedResults().stream().filter(o -> o.getStage().equals(stageRanking.getStage())).findFirst()
				.ifPresentOrElse(result -> stageRanking.setEnds(result.getEnds()),
						() -> stageRanking.getEnds().clear());

		computeRanking(stageRanking.getEnds());
	}

	private void computePerformances(StageRanking stageRanking) {
		/*
		 * [{ "$match" : { "$and" : [{ "performances.performanceValue" : { "$exists" :
		 * true}}, { "performances.performanceValue" : { "$ne" : null}}, { "stage" :
		 * ...}, { "checked" : true}]}}, { "$unwind" : "$performances"}, { "$match" : {
		 * "performances.performanceValue" : { "$exists" : true}}}, { "$project" : {
		 * "stage" : 1, "team" : 1, "name" : "$performances.name", "performanceValue" :
		 * "$performances.performanceValue"}}, { "$sort" : { "stage" : 1, "name" : 1,
		 * "performanceValue" : 1, "team" : 1}}, { "$group" : { "_id" : { "stage" :
		 * "$stage", "name" : "$name"}, "ranking" : { "$push" : { "team" : "$team",
		 * "value" : "$performanceValue"}}}}, { "$group" : { "_id" : "$_id.stage",
		 * "performances" : { "$push" : { "k" : "$_id.name", "v" : "$ranking"}}}}, {
		 * "$project" : { "_id" : 0, "stage" : "$_id", "performances" : {
		 * "$arrayToObject" : "$performances"}}}]
		 */
		Aggregation agg = newAggregation(
				match(new Criteria().andOperator(Criteria.where("performances.performanceValue").exists(true),
						Criteria.where("performances.performanceValue").ne(null),
						Criteria.where("stage").is(stageRanking.getStage()), Criteria.where("checked").is(true))),
				unwind("performances"), match(Criteria.where("performances.performanceValue").exists(true)),
				project("stage", "team", "performances.name", "performances.performanceValue"),
				sort(org.springframework.data.domain.Sort.Direction.ASC, "stage", "name", "performanceValue", "team"),
				group("stage", "name").push(new BasicDBObject("team", "$team").append("value", "$performanceValue"))
						.as("ranking"),
				group("_id.stage").push(new BasicDBObject("k", "$_id.name").append("v", "$ranking")).as("performances"),
				project().andExclude("_id").and("_id").as("stage").and(ArrayToObject.arrayToObject("$performances"))
						.as("performances"));

		var results = mongoTemplate.aggregate(agg, StageResult.class, StageRanking.class);
		results.getMappedResults().stream().filter(o -> o.getStage().equals(stageRanking.getStage())).findFirst()
				.ifPresentOrElse(result -> stageRanking.setPerformances(result.getPerformances()),
						() -> stageRanking.getPerformances().clear());
		stageRanking.getPerformances().values().forEach(StageRankingService::computeRanking);
	}

	private StageRanking findOrMakeStageRankingByStage(Integer stage) {
		if (Objects.isNull(stage))
			return null;
		return stageRankingRepository.findByStage(stage).orElse(makeStageRanking(stage));
	}

	private StageRanking makeStageRanking(Integer stage) {
		if (Objects.nonNull(stageParamService.getStageParamByStage(stage)))
			return new StageRanking(stage);
		return null;
	}

	private StageRanking save(StageRanking stageRanking) {
		stageRanking = stageRankingRepository.save(stageRanking);
		messageProducerService.sendMessage(STAGE_RANKING_UPDATE_EVENT, new StageRankingMessage(stageRanking));
		return stageRanking;
	}
}
