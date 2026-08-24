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
import fr.vandriessche.rallyeschema.coreservice.entities.Team;
import fr.vandriessche.rallyeschema.coreservice.services.SubmittedFormService;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeResponseService;
import fr.vandriessche.rallyeschema.coreservice.services.ChallengeResultService;
import fr.vandriessche.rallyeschema.coreservice.services.TeamService;
import fr.vandriessche.rallyeschema.coreservice.services.TeamPointService;
import lombok.extern.java.Log;

@Service
@Log
@RabbitListener(queues = MessageQueueConfig.DELETE_TEAM_QUEUE_NAME_CONFIG)
public class DeleteTeamConsumer {
	@Autowired
	private SubmittedFormService submittedFormService;
	@Autowired
	private ChallengeResponseService challengeResponseService;
	@Autowired
	private ChallengeResultService challengeResultService;
	@Autowired
	private TeamPointService teamPointService;

	@Value(MessageQueueConfig.DELETE_TEAM_QUEUE_NAME_CONFIG)
	private String deleteTeamQueueName;

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey, final Team team) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey, deleteTeamQueueName,
					team));
			switch (routingKey) {
			case TeamService.TEAM_DELETE_EVENT:
				teamPointService.deleteByTeam(team.getTeam());
				challengeResultService.deleteByTeam(team.getTeam());
				challengeResponseService.deleteByTeam(team.getTeam());
				submittedFormService.deleteByTeam(team.getTeam());
				break;
			}
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}
}
