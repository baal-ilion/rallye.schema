package fr.vandriessche.rallyeschema.responseservice.services;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class ApplicationUpdatePublisher {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void publish(String domain, String path, String method) {
        messagingTemplate.convertAndSend("/topic/applicationUpdate",
                Map.of("domain", domain, "path", path, "method", method));
    }
}
