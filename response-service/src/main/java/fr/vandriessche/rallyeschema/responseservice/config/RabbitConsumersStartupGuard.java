package fr.vandriessche.rallyeschema.responseservice.config;

import java.util.Collection;

import org.springframework.amqp.rabbit.listener.MessageListenerContainer;
import org.springframework.amqp.rabbit.listener.RabbitListenerEndpointRegistry;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Empêche le service de paraître disponible lorsque les traitements asynchrones
 * indispensables aux scores ne sont pas actifs.
 */
@Component
@Profile("!test")
public class RabbitConsumersStartupGuard {

    private final RabbitListenerEndpointRegistry registry;

    public RabbitConsumersStartupGuard(RabbitListenerEndpointRegistry registry) {
        this.registry = registry;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void verifyConsumersAreRunning() {
        Collection<MessageListenerContainer> containers = registry.getListenerContainers();
        if (containers.isEmpty() || containers.stream().anyMatch(container -> !container.isRunning())) {
            throw new IllegalStateException(
                    "Les consommateurs RabbitMQ indispensables aux calculs ne sont pas tous actifs.");
        }
    }
}
