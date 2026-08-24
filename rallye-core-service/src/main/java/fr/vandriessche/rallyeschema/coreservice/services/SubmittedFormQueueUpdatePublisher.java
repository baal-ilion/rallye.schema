package fr.vandriessche.rallyeschema.coreservice.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class SubmittedFormQueueUpdatePublisher {

	@Autowired
	private SimpMessagingTemplate messagingTemplate;

	public void publishUpdate() {
		messagingTemplate.convertAndSend("/topic/submittedFormQueueUpdate", "updated");
	}
}
