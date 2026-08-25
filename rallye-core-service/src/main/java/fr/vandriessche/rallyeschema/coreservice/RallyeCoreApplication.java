package fr.vandriessche.rallyeschema.coreservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.hateoas.LinkRelation;
import org.springframework.hateoas.mediatype.hal.HalConfiguration;
import org.springframework.hateoas.mediatype.hal.HalConfiguration.RenderSingleLinks;

@SpringBootApplication
public class RallyeCoreApplication {

	public static void main(String[] args) {
		SpringApplication.run(RallyeCoreApplication.class, args);
	}

	@Bean
	public HalConfiguration linkRelationBasedPolicy() {
		return new HalConfiguration()
				.withRenderSingleLinksFor(LinkRelation.of("formRecognitionConfigurations"), RenderSingleLinks.AS_ARRAY)
				.withRenderSingleLinksFor(LinkRelation.of("sameSubmittedForms"), RenderSingleLinks.AS_ARRAY)
				.withRenderSingleLinksFor(LinkRelation.of("submittedForms"), RenderSingleLinks.AS_ARRAY);
	}
}
