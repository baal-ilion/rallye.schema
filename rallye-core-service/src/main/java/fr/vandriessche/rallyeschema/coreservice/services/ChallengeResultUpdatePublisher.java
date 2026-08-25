package fr.vandriessche.rallyeschema.coreservice.services;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class ChallengeResultUpdatePublisher {

	@Autowired
	private SimpMessagingTemplate messagingTemplate;

	public void publishUpdate(Integer challenge, Integer team, String operation) {
		publishUpdate(challenge, team, operation, "CONTENT");
	}

	public void publishUpdate(Integer challenge, Integer team, String operation, String scope) {
		messagingTemplate.convertAndSend("/topic/challengeResultUpdate",
				Map.of("challenge", challenge, "team", team, "operation", operation, "scope", scope));
	}
}
