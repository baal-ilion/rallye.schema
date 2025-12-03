package fr.vandriessche.rallyeschema.responseservice.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class TeamInfoUpdatePublisher {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void publishTeamInfoUpdate() {
        messagingTemplate.convertAndSend("/topic/teamInfoUpdate", "update");
    }
}
