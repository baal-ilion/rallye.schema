package fr.vandriessche.rallyeschema.responseservice.services;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class StageResultUpdatePublisher {

	@Autowired
	private SimpMessagingTemplate messagingTemplate;

	public void publishUpdate(Integer stage, Integer team, String operation) {
		messagingTemplate.convertAndSend("/topic/stageResultUpdate",
				Map.of("stage", stage, "team", team, "operation", operation));
	}
}
