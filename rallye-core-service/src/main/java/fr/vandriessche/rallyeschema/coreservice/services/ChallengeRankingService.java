package fr.vandriessche.rallyeschema.coreservice.services;

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

import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeRanking;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeResult;
import fr.vandriessche.rallyeschema.coreservice.entities.TeamRank;
import fr.vandriessche.rallyeschema.coreservice.message.ChallengeRankingMessage;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeRankingRepository;
import lombok.extern.java.Log;

@Service
@Log
public class ChallengeRankingService {
	public static final String CHALLENGE_RANKING_CREATE_EVENT = "challengeRanking.create";
	public static final String CHALLENGE_RANKING_UPDATE_EVENT = "challengeRanking.update";
	public static final String CHALLENGE_RANKING_DELETE_EVENT = "challengeRanking.delete";

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
	private ChallengeRankingRepository challengeRankingRepository;

	@Autowired
	private MongoTemplate mongoTemplate;
	@Autowired
	private ChallengeConfigurationService challengeConfigurationService;

	@Autowired
	private MessageProducerService messageProducerService;

	public void computeAllChallengeRanking() {
		challengeConfigurationService.getChallengeConfigurations().forEach(challengeConfiguration -> computeChallengeRanking(challengeConfiguration.getChallenge()));
	}

	public ChallengeRanking computeChallengeRanking(Integer challenge) {
		ChallengeRanking challengeRanking = findOrMakeChallengeRankingByChallenge(challenge);
		if (challengeRanking == null)
			return null;
		computeBegins(challengeRanking);
		computeEnds(challengeRanking);
		computePerformances(challengeRanking);
		return save(challengeRanking);
	}

	public ChallengeRanking getChallengeRankingByChallenge(Integer challenge) {
		return findOrMakeChallengeRankingByChallenge(challenge);
	}

	public void deleteByChallenge(Integer challenge) {
		challengeRankingRepository.findByChallenge(challenge).ifPresent(challengeRanking -> {
			challengeRankingRepository.delete(challengeRanking);
			messageProducerService.sendMessage(CHALLENGE_RANKING_DELETE_EVENT, new ChallengeRankingMessage(challengeRanking));
		});
	}

	private void computeBegins(ChallengeRanking challengeRanking) {
		/*
		 * [{ "$match" : { "$and" : [{ "begin" : { "$exists" : true}}, { "begin" : {
		 * "$ne" : null}}, { "challenge" : ...}, { "checked" : true}]}}, { "$project" : {
		 * "challenge" : 1, "team" : 1, "begin" : 1}}, { "$sort" : { "challenge" : 1, "begin" :
		 * 1, "team" : 1}}, { "$group" : { "_id" : "$challenge", "_begins" : { "$push" : {
		 * "team" : "$team", "value" : "$begin"}}}}, { "$project" : { "_id" : 0, "challenge"
		 * : "$_id", "begins" : "$_begins"}}]
		 */
		Aggregation agg = newAggregation(
				match(new Criteria().andOperator(Criteria.where("begin").exists(true), Criteria.where("begin").ne(null),
						Criteria.where("challenge").is(challengeRanking.getChallenge()), Criteria.where("checked").is(true))),
				project("challenge", "team", "begin"),
				sort(org.springframework.data.domain.Sort.Direction.ASC, "challenge", "begin", "team"),
				group("challenge").push(new BasicDBObject("team", "$team").append("value", "$begin")).as("_begins"),
				project().andExclude("_id").and("_id").as("challenge").and("_begins").as("begins"));

		var results = mongoTemplate.aggregate(agg, ChallengeResult.class, ChallengeRanking.class);
		results.getMappedResults().stream().filter(o -> o.getChallenge().equals(challengeRanking.getChallenge())).findFirst()
				.ifPresentOrElse(result -> challengeRanking.setBegins(result.getBegins()),
						() -> challengeRanking.getBegins().clear());

		computeRanking(challengeRanking.getBegins());
	}

	private void computeEnds(ChallengeRanking challengeRanking) {
		/*
		 * [{ "$match" : { "$and" : [{ "end" : { "$exists" : true}}, { "end" : { "$ne" :
		 * null}}, { "challenge" : ...}, { "checked" : true}]}}, { "$project" : { "challenge" :
		 * 1, "team" : 1, "end" : 1}}, { "$sort" : { "challenge" : 1, "end" : 1, "team" :
		 * 1}}, { "$group" : { "_id" : "$challenge", "_ends" : { "$push" : { "team" :
		 * "$team", "value" : "$end"}}}}, { "$project" : { "_id" : 0, "challenge" : "$_id",
		 * "ends" : "$_ends"}}]
		 */
		Aggregation agg = newAggregation(
				match(new Criteria().andOperator(Criteria.where("end").exists(true), Criteria.where("end").ne(null),
						Criteria.where("challenge").is(challengeRanking.getChallenge()), Criteria.where("checked").is(true))),
				project("challenge", "team", "end"),
				sort(org.springframework.data.domain.Sort.Direction.ASC, "challenge", "end", "team"),
				group("challenge").push(new BasicDBObject("team", "$team").append("value", "$end")).as("_ends"),
				project().andExclude("_id").and("_id").as("challenge").and("_ends").as("ends"));

		var results = mongoTemplate.aggregate(agg, ChallengeResult.class, ChallengeRanking.class);
		results.getMappedResults().stream().filter(o -> o.getChallenge().equals(challengeRanking.getChallenge())).findFirst()
				.ifPresentOrElse(result -> challengeRanking.setEnds(result.getEnds()),
						() -> challengeRanking.getEnds().clear());

		computeRanking(challengeRanking.getEnds());
	}

	private void computePerformances(ChallengeRanking challengeRanking) {
		/*
		 * [{ "$match" : { "$and" : [{ "performances.performanceValue" : { "$exists" :
		 * true}}, { "performances.performanceValue" : { "$ne" : null}}, { "challenge" :
		 * ...}, { "checked" : true}]}}, { "$unwind" : "$performances"}, { "$match" : {
		 * "performances.performanceValue" : { "$exists" : true}}}, { "$project" : {
		 * "challenge" : 1, "team" : 1, "name" : "$performances.name", "performanceValue" :
		 * "$performances.performanceValue"}}, { "$sort" : { "challenge" : 1, "name" : 1,
		 * "performanceValue" : 1, "team" : 1}}, { "$group" : { "_id" : { "challenge" :
		 * "$challenge", "name" : "$name"}, "ranking" : { "$push" : { "team" : "$team",
		 * "value" : "$performanceValue"}}}}, { "$group" : { "_id" : "$_id.challenge",
		 * "performances" : { "$push" : { "k" : "$_id.name", "v" : "$ranking"}}}}, {
		 * "$project" : { "_id" : 0, "challenge" : "$_id", "performances" : {
		 * "$arrayToObject" : "$performances"}}}]
		 */
		Aggregation agg = newAggregation(
				match(new Criteria().andOperator(Criteria.where("performances.performanceValue").exists(true),
						Criteria.where("performances.performanceValue").ne(null),
						Criteria.where("challenge").is(challengeRanking.getChallenge()), Criteria.where("checked").is(true))),
				unwind("performances"), match(Criteria.where("performances.performanceValue").exists(true)),
				project("challenge", "team", "performances.name", "performances.performanceValue"),
				sort(org.springframework.data.domain.Sort.Direction.ASC, "challenge", "name", "performanceValue", "team"),
				group("challenge", "name").push(new BasicDBObject("team", "$team").append("value", "$performanceValue"))
						.as("ranking"),
				group("_id.challenge").push(new BasicDBObject("k", "$_id.name").append("v", "$ranking")).as("performances"),
				project().andExclude("_id").and("_id").as("challenge").and(ArrayToObject.arrayToObject("$performances"))
						.as("performances"));

		var results = mongoTemplate.aggregate(agg, ChallengeResult.class, ChallengeRanking.class);
		results.getMappedResults().stream().filter(o -> o.getChallenge().equals(challengeRanking.getChallenge())).findFirst()
				.ifPresentOrElse(result -> challengeRanking.setPerformances(result.getPerformances()),
						() -> challengeRanking.getPerformances().clear());
		challengeRanking.getPerformances().values().forEach(ChallengeRankingService::computeRanking);
	}

	private ChallengeRanking findOrMakeChallengeRankingByChallenge(Integer challenge) {
		if (Objects.isNull(challenge))
			return null;
		return challengeRankingRepository.findByChallenge(challenge).orElse(makeChallengeRanking(challenge));
	}

	private ChallengeRanking makeChallengeRanking(Integer challenge) {
		if (Objects.nonNull(challengeConfigurationService.getChallengeConfigurationByChallenge(challenge)))
			return new ChallengeRanking(challenge);
		return null;
	}

	private ChallengeRanking save(ChallengeRanking challengeRanking) {
		challengeRanking = challengeRankingRepository.save(challengeRanking);
		messageProducerService.sendMessage(CHALLENGE_RANKING_UPDATE_EVENT, new ChallengeRankingMessage(challengeRanking));
		return challengeRanking;
	}
}
