package fr.vandriessche.rallyeschema.responseservice.services;

import java.text.MessageFormat;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.responseservice.config.MessageQueueConfig;
import lombok.extern.java.Log;

@Service
@Log
public class MessageProducerService {

	@Autowired
	private RabbitTemplate rabbitTemplate;

	@Value(MessageQueueConfig.EXCHANGE_NAME_CONFIG)
	private String exchangeName;

	public void sendMessage(String routingKey, Object message) {
		log.fine(() -> MessageFormat.format("Sending event {0} ({1})", routingKey,
				message == null ? "null" : message.getClass().getSimpleName()));
		rabbitTemplate.convertAndSend(exchangeName, routingKey, message);
	}
}
