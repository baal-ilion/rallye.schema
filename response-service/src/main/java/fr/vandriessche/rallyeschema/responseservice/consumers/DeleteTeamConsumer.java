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
import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.responseservice.services.ResponseFileService;
import fr.vandriessche.rallyeschema.responseservice.services.StageResponseService;
import fr.vandriessche.rallyeschema.responseservice.services.StageResultService;
import fr.vandriessche.rallyeschema.responseservice.services.TeamInfoService;
import fr.vandriessche.rallyeschema.responseservice.services.TeamPointService;
import lombok.extern.java.Log;

@Service
@Log
@RabbitListener(queues = MessageQueueConfig.DELETE_TEAM_QUEUE_NAME_CONFIG)
public class DeleteTeamConsumer {
	@Autowired
	private ResponseFileService responseFileService;
	@Autowired
	private StageResponseService stageResponseService;
	@Autowired
	private StageResultService stageResultService;
	@Autowired
	private TeamPointService teamPointService;

	@Value(MessageQueueConfig.DELETE_TEAM_QUEUE_NAME_CONFIG)
	private String deleteTeamQueueName;

	@RabbitHandler
	public void receiveMessage(@Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey, final TeamInfo teamInfo) {
		try {
			log.info(MessageFormat.format("Received message {0} from {1} queue : {2}", routingKey, deleteTeamQueueName,
					teamInfo));
			switch (routingKey) {
			case TeamInfoService.TEAM_INFO_DELETE_EVENT:
				teamPointService.deleteByTeam(teamInfo.getTeam());
				stageResultService.deleteByTeam(teamInfo.getTeam());
				stageResponseService.deleteByTeam(teamInfo.getTeam());
				responseFileService.deleteByTeam(teamInfo.getTeam());
				break;
			}
		} catch (Exception e) {
			log.severe(MessageFormat.format("Internal server error occurred in API call. Bypassing message requeue {0}",
					e));
			throw new AmqpRejectAndDontRequeueException(e);
		}
	}
}
