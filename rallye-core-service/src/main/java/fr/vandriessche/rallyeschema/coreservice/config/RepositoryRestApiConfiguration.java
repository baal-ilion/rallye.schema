package fr.vandriessche.rallyeschema.coreservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.rest.webmvc.config.RepositoryRestConfigurer;

/**
 * Preserves the API contract that exposes MongoDB entity identifiers.
 */
@Configuration
public class RepositoryRestApiConfiguration {

	@Bean
	RepositoryRestConfigurer exposeMongoEntityIdentifiers(MongoMappingContext mappingContext) {
		Class<?>[] documentTypes = mappingContext.getPersistentEntities().stream()
				.filter(entity -> entity.isAnnotationPresent(Document.class))
				.map(entity -> entity.getType())
				.toArray(Class<?>[]::new);
		return RepositoryRestConfigurer.withConfig(configuration -> configuration.exposeIdsFor(documentTypes));
	}
}
