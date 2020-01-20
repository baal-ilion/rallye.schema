package fr.vandriessche.rallyeschema.formscannerservice.config;

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

	public static final String SELECT_RESPONSE_QUEUE_NAME_CONFIG = "${rallyeschema.message.selectResponse.queue.name:rallyeschema-selectResponse}";
	public static final String SELECT_RESPONSE_ROUTING_KEYS_CONFIG = "${rallyeschema.message.selectResponse.routing.key:responseFile.*,stageResponse.*}";
	public static final String COMPUTE_TEAM_POINT_QUEUE_NAME_CONFIG = "${rallyeschema.message.computeTeamPoint.queue.name:rallyeschema-computeTeamPoint}";
	public static final String COMPUTE_TEAM_POINT_ROUTING_KEYS_CONFIG = "${rallyeschema.message.computeTeamPoint.routing.key:stageResult.*,stageRanking.*}";
	public static final String COMPUTE_STAGE_RANKING_QUEUE_NAME_CONFIG = "${rallyeschema.message.computeStageRanking.queue.name:rallyeschema-computeStageRanking}";
	public static final String COMPUTE_STAGE_RANKING_ROUTING_KEYS_CONFIG = "${rallyeschema.message.computeStageRanking.routing.key:stageResult.*}";

	@Value(EXCHANGE_NAME_CONFIG)
	private String exchangeName;

	@Value(SELECT_RESPONSE_QUEUE_NAME_CONFIG)
	private String selectResponseQueueName;
	@Value(SELECT_RESPONSE_ROUTING_KEYS_CONFIG)
	private String[] selectResponseRoutingKeys;
	@Value(COMPUTE_TEAM_POINT_QUEUE_NAME_CONFIG)
	private String computeTeamPointQueueName;
	@Value(COMPUTE_TEAM_POINT_ROUTING_KEYS_CONFIG)
	private String[] computeTeamPointRoutingKeys;
	@Value(COMPUTE_STAGE_RANKING_QUEUE_NAME_CONFIG)
	private String computeStageRankingQueueName;
	@Value(COMPUTE_STAGE_RANKING_ROUTING_KEYS_CONFIG)
	private String[] computeStageRankingRoutingKeys;

	@Bean
	public TopicExchange getExchange() {
		return new TopicExchange(exchangeName);
	}

	@Bean
	public Queue getSelectResponseQueue() {
		return new Queue(selectResponseQueueName);
	}

	@Bean
	public Declarables declareBindingSelectResponse() {
		return new Declarables(Arrays.asList(selectResponseRoutingKeys).stream()
				.map(routingKey -> BindingBuilder.bind(getSelectResponseQueue()).to(getExchange()).with(routingKey))
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
	public Queue getComputeStageRankingQueue() {
		return new Queue(computeStageRankingQueueName);
	}

	@Bean
	public Declarables declareBindingComputeStageRanking() {
		return new Declarables(Arrays.asList(computeStageRankingRoutingKeys).stream().map(
				routingKey -> BindingBuilder.bind(getComputeStageRankingQueue()).to(getExchange()).with(routingKey))
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
