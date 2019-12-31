package fr.vandriessche.rallyeschema.formscannerservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.hateoas.LinkRelation;
import org.springframework.hateoas.mediatype.hal.HalConfiguration;
import org.springframework.hateoas.mediatype.hal.HalConfiguration.RenderSingleLinks;

@SpringBootApplication
public class FormScannerServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(FormScannerServiceApplication.class, args);
	}

	@Bean
	public HalConfiguration linkRelationBasedPolicy() {
		return new HalConfiguration() //
				.withRenderSingleLinksFor( //
						LinkRelation.of("responseFileParams"), RenderSingleLinks.AS_ARRAY);
	}
}
