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
import fr.vandriessche.rallyeschema.formscannerservice.message.StageResultMessage;
import fr.vandriessche.rallyeschema.formscannerservice.services.StageResultService;
import fr.vandriessche.rallyeschema.formscannerservice.services.TeamPointService;
import lombok.extern.java.Log;

@Service
@Log
@RabbitListener(queues = MessageQueueConfig.COMPUTE_TEAM_POINT_QUEUE_NAME_CONFIG)
public class ComputeTeamPointConsumer {
	@Autowired
	private TeamPointService teamPointService;

	@Value(MessageQueueConfig.COMPUTE_TEAM_POINT_QUEUE_NAME_CONFIG)
	private String computeTeamPointQueueName;

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey,
			final StageResultMessage stageResult) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey,
					computeTeamPointQueueName, stageResult));
			switch (routingKey) {
			case StageResultService.STAGE_RESULT_DELETE_EVENT:
			case StageResultService.STAGE_RESULT_CREATE_EVENT:
			case StageResultService.STAGE_RESULT_UPDATE_EVENT:
			default:
				teamPointService.computeTeamPoint(stageResult.getId());
				break;
			}
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}
}
