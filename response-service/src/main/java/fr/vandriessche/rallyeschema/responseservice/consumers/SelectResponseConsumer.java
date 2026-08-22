package fr.vandriessche.rallyeschema.responseservice.consumers;

import java.text.MessageFormat;
import java.util.Objects;

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
			log.info(MessageFormat.format("Received {0} for response file {1} from {2}", routingKey,
					responseFileInfo.getId(), selectResponseQueueName));
			switch (routingKey) {
			case ResponseFileService.RESPONSE_FILE_DELETE_EVENT:
				stageResultService.removeResponseFileEvent(responseFileInfo);
				break;
			case ResponseFileService.RESPONSE_FILE_CREATE_EVENT:
				// Un import brut n'a encore aucun effet sur un résultat ni sur le classement.
				break;
			case ResponseFileService.RESPONSE_FILE_UPDATE_EVENT:
			default:
				// null = simple vérification/recalcul géométrique ; true/false = validation/dévalidation.
				if (Objects.nonNull(responseFileInfo.getChecked()))
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
			log.info(MessageFormat.format("Received {0} for stage response {1} from {2}", routingKey,
					stageResponse.getId(), selectResponseQueueName));
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
