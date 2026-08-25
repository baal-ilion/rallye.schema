package fr.vandriessche.rallyeschema.coreservice.config;

import java.util.Arrays;
import java.util.stream.Collectors;

import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MessageQueueConfig {

	public static final String EXCHANGE_NAME_CONFIG = "${rallyeschema.message.exchange.name:rallyeschema-exchange}";

	public static final String CHALLENGE_RESULT_INPUT_QUEUE_NAME_CONFIG = "${rallyeschema.message.challengeResultInput.queue.name:rallyeschema-challenge-result-input}";
	public static final String CHALLENGE_RESULT_INPUT_ROUTING_KEYS_CONFIG = "${rallyeschema.message.challengeResultInput.routing.key:submittedForm.*,challengeResponse.*}";
	public static final String COMPUTE_TEAM_POINT_QUEUE_NAME_CONFIG = "${rallyeschema.message.computeTeamPoint.queue.name:rallyeschema-computeTeamPoint}";
	public static final String COMPUTE_TEAM_POINT_ROUTING_KEYS_CONFIG = "${rallyeschema.message.computeTeamPoint.routing.key:challengeResult.*,challengeRanking.*}";
	public static final String COMPUTE_CHALLENGE_RANKING_QUEUE_NAME_CONFIG = "${rallyeschema.message.computeChallengeRanking.queue.name:rallyeschema-computeChallengeRanking}";
	public static final String COMPUTE_CHALLENGE_RANKING_ROUTING_KEYS_CONFIG = "${rallyeschema.message.computeChallengeRanking.routing.key:challengeResult.*}";
	public static final String DELETE_TEAM_QUEUE_NAME_CONFIG = "${rallyeschema.message.deleteTeam.queue.name:rallyeschema-deleteTeam}";
	public static final String DELETE_TEAM_ROUTING_KEYS_CONFIG = "${rallyeschema.message.deleteTeam.routing.key:team.delete}";

	@Value(EXCHANGE_NAME_CONFIG)
	private String exchangeName;

	@Value(CHALLENGE_RESULT_INPUT_QUEUE_NAME_CONFIG)
	private String challengeResultInputQueueName;
	@Value(CHALLENGE_RESULT_INPUT_ROUTING_KEYS_CONFIG)
	private String[] challengeResultInputRoutingKeys;
	@Value(COMPUTE_TEAM_POINT_QUEUE_NAME_CONFIG)
	private String computeTeamPointQueueName;
	@Value(COMPUTE_TEAM_POINT_ROUTING_KEYS_CONFIG)
	private String[] computeTeamPointRoutingKeys;
	@Value(COMPUTE_CHALLENGE_RANKING_QUEUE_NAME_CONFIG)
	private String computeChallengeRankingQueueName;
	@Value(COMPUTE_CHALLENGE_RANKING_ROUTING_KEYS_CONFIG)
	private String[] computeChallengeRankingRoutingKeys;
	@Value(DELETE_TEAM_QUEUE_NAME_CONFIG)
	private String deleteTeamQueueName;
	@Value(DELETE_TEAM_ROUTING_KEYS_CONFIG)
	private String[] deleteTeamRoutingKeys;

	@Bean
	public TopicExchange getExchange() {
		return new TopicExchange(exchangeName);
	}

	@Bean
	public Queue getChallengeResultInputQueue() {
		return new Queue(challengeResultInputQueueName);
	}

	@Bean
	public Declarables declareChallengeResultInputBindings() {
		return new Declarables(Arrays.asList(challengeResultInputRoutingKeys).stream()
				.map(routingKey -> BindingBuilder.bind(getChallengeResultInputQueue()).to(getExchange()).with(routingKey))
				.collect(Collectors.toList()));
	}

	@Bean
	public Queue getComputeTeamPointQueue() {
		return new Queue(computeTeamPointQueueName);
	}

	@Bean
	public Declarables declareBindingComputeTeamPoint() {
		return new Declarables(Arrays.asList(computeTeamPointRoutingKeys).stream()
				.map(routingKey -> BindingBuilder.bind(getComputeTeamPointQueue()).to(getExchange()).with(routingKey))
				.collect(Collectors.toList()));
	}

	@Bean
	public Queue getComputeChallengeRankingQueue() {
		return new Queue(computeChallengeRankingQueueName);
	}

	@Bean
	public Declarables declareBindingComputeChallengeRanking() {
		return new Declarables(Arrays.asList(computeChallengeRankingRoutingKeys).stream().map(
				routingKey -> BindingBuilder.bind(getComputeChallengeRankingQueue()).to(getExchange()).with(routingKey))
				.collect(Collectors.toList()));
	}

	@Bean
	public Queue getDeleteTeamQueue() {
		return new Queue(deleteTeamQueueName);
	}

	@Bean
	public Declarables declareBindingDeleteTeam() {
		return new Declarables(Arrays.asList(deleteTeamRoutingKeys).stream()
				.map(routingKey -> BindingBuilder.bind(getDeleteTeamQueue()).to(getExchange()).with(routingKey))
				.collect(Collectors.toList()));
	}

	@Bean
	public RabbitTemplate rabbitTemplate(final ConnectionFactory connectionFactory) {
		final RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
		rabbitTemplate.setMessageConverter(producerJackson2MessageConverter());
		return rabbitTemplate;
	}

	@Bean
	public Jackson2JsonMessageConverter producerJackson2MessageConverter() {
		return new Jackson2JsonMessageConverter();
	}

}
