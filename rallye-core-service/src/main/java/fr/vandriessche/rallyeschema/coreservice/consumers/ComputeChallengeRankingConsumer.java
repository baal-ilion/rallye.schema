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
import fr.vandriessche.rallyeschema.coreservice.message.ChallengeResultMessage;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeRankingService;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeResultService;
import lombok.extern.java.Log;

@Service
@Log
@RabbitListener(queues = MessageQueueConfig.COMPUTE_CHALLENGE_RANKING_QUEUE_NAME_CONFIG)
public class ComputeChallengeRankingConsumer {
	@Autowired
	private ChallengeRankingService challengeRankingService;

	@Value(MessageQueueConfig.COMPUTE_CHALLENGE_RANKING_QUEUE_NAME_CONFIG)
	private String computeChallengeRankingQueueName;

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey,
			final ChallengeResultMessage challengeResult) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey,
					computeChallengeRankingQueueName, challengeResult));
			switch (routingKey) {
			case ChallengeResultService.CHALLENGE_RESULT_DELETE_EVENT:
			case ChallengeResultService.CHALLENGE_RESULT_CREATE_EVENT:
			case ChallengeResultService.CHALLENGE_RESULT_UPDATE_EVENT:
			default:
				challengeRankingService.computeChallengeRanking(challengeResult.getChallenge());
				break;
			}
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}
}
