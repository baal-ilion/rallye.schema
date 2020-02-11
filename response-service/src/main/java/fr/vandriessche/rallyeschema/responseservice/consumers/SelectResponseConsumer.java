package fr.vandriessche.rallyeschema.responseservice.consumers;

import java.text.MessageFormat;

import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.responseservice.config.MessageQueueConfig;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.responseservice.message.StageResponseMessage;
import fr.vandriessche.rallyeschema.responseservice.services.ResponseFileService;
import fr.vandriessche.rallyeschema.responseservice.services.StageResponseService;
import fr.vandriessche.rallyeschema.responseservice.services.StageResultService;
import lombok.extern.java.Log;

@Service
@Log
@RabbitListener(queues = MessageQueueConfig.SELECT_RESPONSE_QUEUE_NAME_CONFIG)
public class SelectResponseConsumer {
	@Autowired
	private StageResultService stageResultService;

	@Value(MessageQueueConfig.SELECT_RESPONSE_QUEUE_NAME_CONFIG)
	private String selectResponseQueueName;

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey,
			final ResponseFileInfo responseFileInfo) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey,
					selectResponseQueueName, responseFileInfo));
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

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey,
			final StageResponseMessage stageResponse) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey,
					selectResponseQueueName, stageResponse));
			switch (routingKey) {
			case StageResponseService.STAGE_RESPONSE_DELETE_EVENT:
				stageResultService.removeStageResponseEvent(stageResponse.getId());
				break;
			case StageResponseService.STAGE_RESPONSE_CREATE_EVENT:
			case StageResponseService.STAGE_RESPONSE_UPDATE_EVENT:
			default:
				stageResultService.updateStageResponseEvent(stageResponse.getId());
				break;
			}
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}
}
