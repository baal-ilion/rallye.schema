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
import fr.vandriessche.rallyeschema.responseservice.message.StageResultMessage;
import fr.vandriessche.rallyeschema.responseservice.services.StageRankingService;
import fr.vandriessche.rallyeschema.responseservice.services.StageResultService;
import lombok.extern.java.Log;

@Service
@Log
@RabbitListener(queues = MessageQueueConfig.COMPUTE_STAGE_RANKING_QUEUE_NAME_CONFIG)
public class ComputeStageRankingConsumer {
	@Autowired
	private StageRankingService stageRankingService;

	@Value(MessageQueueConfig.COMPUTE_STAGE_RANKING_QUEUE_NAME_CONFIG)
	private String computeStageRankingQueueName;

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey,
			final StageResultMessage stageResult) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey,
					computeStageRankingQueueName, stageResult));
			switch (routingKey) {
			case StageResultService.STAGE_RESULT_DELETE_EVENT:
			case StageResultService.STAGE_RESULT_CREATE_EVENT:
			case StageResultService.STAGE_RESULT_UPDATE_EVENT:
			default:
				stageRankingService.computeStageRanking(stageResult.getStage());
				break;
			}
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}
}
