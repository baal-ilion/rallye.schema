package fr.vandriessche.rallyeschema.formscannerservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
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

	public static final String SELECT_RESPONSE_FILE_QUEUE_NAME_CONFIG = "${rallyeschema.message.selectResponseFile.queue.name:rallyeschema-selectResponseFile}";
	public static final String SELECT_RESPONSE_FILE_ROUTING_KEY_CONFIG = "${rallyeschema.message.selectResponseFile.routing.key:responseFile.*}";
	public static final String COMPUTE_TEAM_POINT_QUEUE_NAME_CONFIG = "${rallyeschema.message.computeTeamPoint.queue.name:rallyeschema-computeTeamPoint}";
	public static final String COMPUTE_TEAM_POINT_ROUTING_KEY_CONFIG = "${rallyeschema.message.computeTeamPoint.routing.key:stageResult.*}";

	@Value(EXCHANGE_NAME_CONFIG)
	private String exchangeName;

	@Value(SELECT_RESPONSE_FILE_QUEUE_NAME_CONFIG)
	private String selectResponseFileQueueName;
	@Value(SELECT_RESPONSE_FILE_ROUTING_KEY_CONFIG)
	private String selectResponseFileRoutingKey;
	@Value(COMPUTE_TEAM_POINT_QUEUE_NAME_CONFIG)
	private String computeTeamPointQueueName;
	@Value(COMPUTE_TEAM_POINT_ROUTING_KEY_CONFIG)
	private String computeTeamPointRoutingKey;

	@Bean
	public TopicExchange getExchange() {
		return new TopicExchange(exchangeName);
	}

	@Bean
	public Queue getSelectResponseFileQueue() {
		return new Queue(selectResponseFileQueueName);
	}

	@Bean
	public Binding declareBindingSelectResponseFile() {
		return BindingBuilder.bind(getSelectResponseFileQueue()).to(getExchange()).with(selectResponseFileRoutingKey);
	}

	@Bean
	public Queue getComputeTeamPointQueue() {
		return new Queue(computeTeamPointQueueName);
	}

	@Bean
	public Binding declareBindingComputeTeamPoint() {
		return BindingBuilder.bind(getComputeTeamPointQueue()).to(getExchange()).with(computeTeamPointRoutingKey);
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
