package fr.vandriessche.rallyeschema.coreservice.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;

class MessageQueueConfigTests {

	@Test
	void instantValuesRoundTripThroughTheAmqpConverter() {
		Jackson2JsonMessageConverter converter = new MessageQueueConfig().producerJackson2MessageConverter();
		SubmittedFormMetadata source = new SubmittedFormMetadata();
		Instant createdAt = Instant.parse("2026-08-29T10:26:30.777Z");
		source.setId("form-1");
		source.setProcessingCreatedAt(createdAt);

		Message message = converter.toMessage(source, new MessageProperties());
		Object converted = converter.fromMessage(message);

		assertThat(converted).isInstanceOf(SubmittedFormMetadata.class);
		assertThat(((SubmittedFormMetadata) converted).getProcessingCreatedAt()).isEqualTo(createdAt);
	}
}
