package fr.vandriessche.rallyeschema.coreservice;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;

import fr.vandriessche.rallyeschema.coreservice.controllers.FormRecognitionConfigurationController;
import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormReferenceImageRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormRecognitionConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = "server.ssl.enabled=false")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@ActiveProfiles("test")
class FormRecognitionConfigurationControllerTests {
	@Autowired
	private TestRestTemplate restTemplate;

	@Autowired
	private FormRecognitionConfigurationRepository formRecognitionConfigurationRepository;

	@LocalServerPort
	int randomServerPort;

	@BeforeAll
	static void InitTests(@Autowired FormRecognitionConfigurationRepository formRecognitionConfigurationRepository,
			@Autowired FormReferenceImageRepository formReferenceImageRepository,
			@Autowired ChallengeConfigurationRepository challengeConfigurationRepository) {
		formRecognitionConfigurationRepository.deleteAll();
		formReferenceImageRepository.deleteAll();
		challengeConfigurationRepository.deleteAll();
	}

	@AfterAll
	static void FinalyseTests(@Autowired FormRecognitionConfigurationRepository formRecognitionConfigurationRepository,
			@Autowired FormReferenceImageRepository formReferenceImageRepository,
			@Autowired ChallengeConfigurationRepository challengeConfigurationRepository) {
		formRecognitionConfigurationRepository.deleteAll();
		formReferenceImageRepository.deleteAll();
		challengeConfigurationRepository.deleteAll();
	}

	@Test
	@Order(1)
	void findsTaskById() throws Exception {
		// quant il n'y a pas de parametrage la list est vide
		final String baseUrl = "http://localhost:" + randomServerPort;
		ResponseEntity<String> result = this.restTemplate.getForEntity(baseUrl + FormRecognitionConfigurationController.URL,
				String.class);

		// Verify request succeed
		assertThat(result.getStatusCode(), equalTo(HttpStatus.OK));
		var body = JsonPath.parse(result.getBody());
		assertDoesNotThrow(() -> body.read("$._links"));
		assertDoesNotThrow(() -> body.read("$.page"));
		assertThrows(com.jayway.jsonpath.PathNotFoundException.class, () -> body.read("$._embedded"));
	}

	@Test
	@Order(2)
	public void formRecognitionConfiguration() throws Exception {
		final String baseUrl = "http://localhost:" + randomServerPort;

		MultiValueMap<String, Object> restBody = new LinkedMultiValueMap<>();
		restBody.add("formReferenceImage", new ClassPathResource("Challenge 1 - Page 1.jpg"));

		FormRecognitionConfiguration formRecognitionConfiguration = new FormRecognitionConfiguration();
		formRecognitionConfiguration.setChallenge(1);
		formRecognitionConfiguration.setPage(1);
		formRecognitionConfiguration.setTemplate(readStringResourceFile("Challenge 1 - Page 1.xtmpl"));
		ObjectMapper objectMapper = new ObjectMapper();
		restBody.add("formRecognitionConfiguration", objectMapper.writeValueAsString(formRecognitionConfiguration));

		ResponseEntity<String> result = this.restTemplate.postForEntity(baseUrl + FormRecognitionConfigurationController.URL,
				restBody, String.class);

		assertThat(result.getStatusCode(), equalTo(HttpStatus.OK));
		var body = JsonPath.parse(result.getBody());
		assertDoesNotThrow(() -> body.read("$.id"));
		String id = body.read("$.id");
		assertEquals(formRecognitionConfiguration.getChallenge(), body.read("$.challenge"));
		assertEquals(formRecognitionConfiguration.getPage(), body.read("$.page"));
		assertEquals(formRecognitionConfiguration.getTemplate(), body.read("$.template"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id, body.read("$._links.self.href"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id,
				body.read("$._links.formRecognitionConfiguration.href"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id + "/template",
				body.read("$._links.submittedFormTemplate.href"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id + "/image",
				body.read("$._links.formReferenceImage.href"));

		ResponseEntity<String> result1 = this.restTemplate.getForEntity(baseUrl + FormRecognitionConfigurationController.URL,
				String.class);

		// Verify request succeed
		assertThat(result1.getStatusCode(), equalTo(HttpStatus.OK));
		var body1 = JsonPath.parse(result1.getBody());
		assertDoesNotThrow(() -> body1.read("$._links"));
		assertDoesNotThrow(() -> body1.read("$.page"));
		assertDoesNotThrow(() -> body1.read("$._embedded.formRecognitionConfigurations"));
		List<Object> formRecognitionConfigurations = body1.read("$._embedded.formRecognitionConfigurations");
		assertEquals(1, formRecognitionConfigurations.size());
		assertEquals(id, body1.read("$._embedded.formRecognitionConfigurations[0].id"));
		assertEquals(formRecognitionConfiguration.getChallenge(), body1.read("$._embedded.formRecognitionConfigurations[0].challenge"));
		assertEquals(formRecognitionConfiguration.getPage(), body1.read("$._embedded.formRecognitionConfigurations[0].page"));
		assertEquals(formRecognitionConfiguration.getTemplate(), body1.read("$._embedded.formRecognitionConfigurations[0].template"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id,
				body1.read("$._embedded.formRecognitionConfigurations[0]._links.self.href"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id,
				body1.read("$._embedded.formRecognitionConfigurations[0]._links.formRecognitionConfiguration.href"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id + "/template",
				body1.read("$._embedded.formRecognitionConfigurations[0]._links.submittedFormTemplate.href"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id + "/image",
				body1.read("$._embedded.formRecognitionConfigurations[0]._links.formReferenceImage.href"));
	}

	@Test
	@Order(3)
	public void formRecognitionConfigurationerror() throws Exception {
		final String baseUrl = "http://localhost:" + randomServerPort;

		MultiValueMap<String, Object> restBody = new LinkedMultiValueMap<>();
		restBody.add("formReferenceImage", new ClassPathResource("Challenge 1 - Page 2.jpg"));

		FormRecognitionConfiguration formRecognitionConfiguration = new FormRecognitionConfiguration();
		formRecognitionConfiguration.setChallenge(1);
		formRecognitionConfiguration.setPage(2);
		formRecognitionConfiguration.setTemplate(readStringResourceFile("Challenge 1 - Page 2.xtmpl"));
		ObjectMapper objectMapper = new ObjectMapper();
		restBody.add("formRecognitionConfiguration", objectMapper.writeValueAsString(formRecognitionConfiguration));

		ResponseEntity<String> result = this.restTemplate.postForEntity(baseUrl + FormRecognitionConfigurationController.URL,
				restBody, String.class);

		assertThat(result.getStatusCode(), equalTo(HttpStatus.OK));
		var body = JsonPath.parse(result.getBody());
		assertDoesNotThrow(() -> body.read("$.id"));
		String id = body.read("$.id");
		assertEquals(formRecognitionConfiguration.getChallenge(), body.read("$.challenge"));
		assertEquals(formRecognitionConfiguration.getPage(), body.read("$.page"));
		assertEquals(formRecognitionConfiguration.getTemplate(), body.read("$.template"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id, body.read("$._links.self.href"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id,
				body.read("$._links.formRecognitionConfiguration.href"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id + "/template",
				body.read("$._links.submittedFormTemplate.href"));
		assertEquals(baseUrl + FormRecognitionConfigurationController.URL + "/" + id + "/image",
				body.read("$._links.formReferenceImage.href"));

		ResponseEntity<String> result1 = this.restTemplate.postForEntity(baseUrl + FormRecognitionConfigurationController.URL,
				restBody, String.class);

		assertThat(result1.getStatusCode(), equalTo(HttpStatus.INTERNAL_SERVER_ERROR));
		assertEquals(2, formRecognitionConfigurationRepository.count(),
				"Le second envoi ne doit pas créer de modèle en doublon.");
	}

	private String readStringResourceFile(String pathOnClassPath) throws Exception {
		return Files.readString(
				Paths.get(Thread.currentThread().getContextClassLoader().getResource(pathOnClassPath).toURI()));
	}
}
