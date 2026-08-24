package fr.vandriessche.rallyeschema.coreservice.consumers;

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

import fr.vandriessche.rallyeschema.coreservice.config.MessageQueueConfig;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;
import fr.vandriessche.rallyeschema.coreservice.message.ChallengeResponseMessage;
import fr.vandriessche.rallyeschema.coreservice.services.SubmittedFormService;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeResponseService;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeResultService;
import lombok.extern.java.Log;

@Service
@Log
@RabbitListener(queues = MessageQueueConfig.CHALLENGE_RESULT_INPUT_QUEUE_NAME_CONFIG)
public class ChallengeResultInputConsumer {
	@Autowired
	private ChallengeResultService challengeResultService;

	@Value(MessageQueueConfig.CHALLENGE_RESULT_INPUT_QUEUE_NAME_CONFIG)
	private String challengeResultInputQueueName;

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey,
			final SubmittedFormMetadata submittedFormMetadata) {
		try {
			log.info(MessageFormat.format("Received {0} for submitted form {1} from {2}", routingKey,
					submittedFormMetadata.getId(), challengeResultInputQueueName));
			switch (routingKey) {
			case SubmittedFormService.SUBMITTED_FORM_DELETE_EVENT:
				challengeResultService.removeSubmittedFormEvent(submittedFormMetadata);
				break;
			case SubmittedFormService.SUBMITTED_FORM_CREATE_EVENT:
				// Un import brut n'a encore aucun effet sur un résultat ni sur le classement.
				break;
			case SubmittedFormService.SUBMITTED_FORM_UPDATE_EVENT:
			default:
				// null = simple vérification/recalcul géométrique ; true/false = validation/dévalidation.
				if (Objects.nonNull(submittedFormMetadata.getChecked()))
					challengeResultService.updateSubmittedFormEvent(submittedFormMetadata.getId());
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
			final ChallengeResponseMessage challengeResponse) {
		try {
			log.info(MessageFormat.format("Received {0} for challenge response {1} from {2}", routingKey,
					challengeResponse.getId(), challengeResultInputQueueName));
			switch (routingKey) {
			case ChallengeResponseService.CHALLENGE_RESPONSE_DELETE_EVENT:
				challengeResultService.removeChallengeResponseEvent(challengeResponse.getId());
				break;
			case ChallengeResponseService.CHALLENGE_RESPONSE_CREATE_EVENT:
			case ChallengeResponseService.CHALLENGE_RESPONSE_UPDATE_EVENT:
			default:
				challengeResultService.updateChallengeResponseEvent(challengeResponse.getId());
				break;
			}
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}
}
