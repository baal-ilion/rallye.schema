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
import fr.vandriessche.rallyeschema.responseservice.message.StageRankingMessage;
import fr.vandriessche.rallyeschema.responseservice.message.StageResultMessage;
import fr.vandriessche.rallyeschema.responseservice.services.StageRankingService;
import fr.vandriessche.rallyeschema.responseservice.services.StageResultService;
import fr.vandriessche.rallyeschema.responseservice.services.TeamPointService;
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
				teamPointService.computeTeamPointFromDeletedStageResult(stageResult.getStage(), stageResult.getTeam());
				break;
			case StageResultService.STAGE_RESULT_CREATE_EVENT:
			case StageResultService.STAGE_RESULT_UPDATE_EVENT:
			default:
				teamPointService.computeTeamPointFromStageResult(stageResult.getId());
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
			final StageRankingMessage stageRanking) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey,
					computeTeamPointQueueName, stageRanking));
			switch (routingKey) {
			case StageRankingService.STAGE_RANKING_DELETE_EVENT:
			case StageRankingService.STAGE_RANKING_CREATE_EVENT:
			case StageRankingService.STAGE_RANKING_UPDATE_EVENT:
			default:
				teamPointService.computeTeamPointFromStageRanking(stageRanking.getStage());
				break;
			}
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}
}
