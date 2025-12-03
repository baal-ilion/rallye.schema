package fr.vandriessche.rallyeschema.responseservice.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class RankingUpdatePublisher {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void publishRankingUpdate() {
        messagingTemplate.convertAndSend("/topic/rankingUpdate", "update");
    }
}
