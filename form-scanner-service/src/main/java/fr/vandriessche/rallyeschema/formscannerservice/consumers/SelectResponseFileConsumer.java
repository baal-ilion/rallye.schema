package fr.vandriessche.rallyeschema.formscannerservice.consumers;

import java.text.MessageFormat;

import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.formscannerservice.config.MessageQueueConfig;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.formscannerservice.services.ResponseFileService;
import fr.vandriessche.rallyeschema.formscannerservice.services.StageResultService;
import lombok.extern.java.Log;

@Service
@Log
@RabbitListener(queues = MessageQueueConfig.SELECT_RESPONSE_FILE_QUEUE_NAME_CONFIG)
public class SelectResponseFileConsumer {
	@Autowired
	private StageResultService stageResultService;

	@Value(MessageQueueConfig.SELECT_RESPONSE_FILE_QUEUE_NAME_CONFIG)
	private String selectResponseFileQueueName;

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey,
			final ResponseFileInfo responseFileInfo) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey,
					selectResponseFileQueueName, responseFileInfo));
			switch (routingKey) {
			case ResponseFileService.RESPONSE_FILE_DELETE_EVENT:
				stageResultService.removeResponseFileEvent(responseFileInfo.getId());
				break;
			case ResponseFileService.RESPONSE_FILE_CREATE_EVENT:
			case ResponseFileService.RESPONSE_FILE_UPDATE_EVENT:
			default:
				stageResultService.updateResponseFileEvent(responseFileInfo.getId());
				break;
			}
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}
}
