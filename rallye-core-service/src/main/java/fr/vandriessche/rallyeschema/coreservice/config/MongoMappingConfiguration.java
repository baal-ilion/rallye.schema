package fr.vandriessche.rallyeschema.coreservice.config;

import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;

/**
 * Adapte la sérialisation des clés de Map aux contraintes de MongoDB.
 *
 * Les labels métier des questions peuvent légitimement contenir un point
 * (par exemple « S1.01 »), alors que MongoDB interdit ce caractère dans un
 * nom de champ. Le convertisseur remplace le point uniquement dans le document
 * stocké et restitue automatiquement le label original à la lecture.
 */
@Configuration
public class MongoMappingConfiguration {

	private static final String MAP_KEY_DOT_REPLACEMENT = "__rallye_dot__";

	@Bean
	public BeanPostProcessor mongoMapKeyConfiguration() {
		return new BeanPostProcessor() {
			@Override
			public Object postProcessBeforeInitialization(Object bean, String beanName) {
				if (bean instanceof MappingMongoConverter) {
					((MappingMongoConverter) bean).setMapKeyDotReplacement(MAP_KEY_DOT_REPLACEMENT);
				}
				return bean;
			}
		};
	}
}
