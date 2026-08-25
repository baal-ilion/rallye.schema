package fr.vandriessche.rallyeschema.coreservice.consumers;

import java.text.MessageFormat;

import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.coreservice.config.MessageQueueConfig;
import fr.vandriessche.rallyeschema.coreservice.message.ChallengeRankingMessage;
import fr.vandriessche.rallyeschema.coreservice.message.ChallengeResultMessage;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeRankingService;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeResultService;
import fr.vandriessche.rallyeschema.coreservice.services.TeamPointService;
import fr.vandriessche.rallyeschema.coreservice.services.RankingUpdatePublisher;
import lombok.extern.java.Log;

@Service
@Log
@RabbitListener(queues = MessageQueueConfig.COMPUTE_TEAM_POINT_QUEUE_NAME_CONFIG)
public class ComputeTeamPointConsumer {
	@Autowired
	private TeamPointService teamPointService;
	@Autowired
	private RankingUpdatePublisher rankingUpdatePublisher;

	@Value(MessageQueueConfig.COMPUTE_TEAM_POINT_QUEUE_NAME_CONFIG)
	private String computeTeamPointQueueName;

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey,
			final ChallengeResultMessage challengeResult) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey,
					computeTeamPointQueueName, challengeResult));
			switch (routingKey) {
			case ChallengeResultService.CHALLENGE_RESULT_DELETE_EVENT:
				teamPointService.computeTeamPointFromDeletedChallengeResult(challengeResult.getChallenge(), challengeResult.getTeam());
				break;
			case ChallengeResultService.CHALLENGE_RESULT_CREATE_EVENT:
			case ChallengeResultService.CHALLENGE_RESULT_UPDATE_EVENT:
			default:
				teamPointService.computeTeamPointFromChallengeResult(challengeResult.getId());
				break;
			}
			rankingUpdatePublisher.publishRankingUpdate();
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey,
			final ChallengeRankingMessage challengeRanking) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey,
					computeTeamPointQueueName, challengeRanking));
			switch (routingKey) {
			case ChallengeRankingService.CHALLENGE_RANKING_DELETE_EVENT:
			case ChallengeRankingService.CHALLENGE_RANKING_CREATE_EVENT:
			case ChallengeRankingService.CHALLENGE_RANKING_UPDATE_EVENT:
			default:
				teamPointService.computeTeamPointFromChallengeRanking(challengeRanking.getChallenge());
				break;
			}
			rankingUpdatePublisher.publishRankingUpdate();
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}
}
