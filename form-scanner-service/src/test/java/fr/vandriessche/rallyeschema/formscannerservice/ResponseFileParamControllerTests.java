package fr.vandriessche.rallyeschema.formscannerservice;

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

import fr.vandriessche.rallyeschema.formscannerservice.controllers.ResponseFileParamController;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponseFileModelRepository;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponseFileParamRepository;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.StageParamRepository;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@ActiveProfiles("test")
class ResponseFileParamControllerTests {
	@Autowired
	private TestRestTemplate restTemplate;

	@LocalServerPort
	int randomServerPort;

	@BeforeAll
	static void InitTests(@Autowired ResponseFileParamRepository responseFileParamRepository,
			@Autowired ResponseFileModelRepository responseFileModelRepository,
			@Autowired StageParamRepository stageParamRepository) {
		responseFileParamRepository.deleteAll();
		responseFileModelRepository.deleteAll();
		stageParamRepository.deleteAll();
	}

	@AfterAll
	static void FinalyseTests(@Autowired ResponseFileParamRepository responseFileParamRepository,
			@Autowired ResponseFileModelRepository responseFileModelRepository,
			@Autowired StageParamRepository stageParamRepository) {
		responseFileParamRepository.deleteAll();
		responseFileModelRepository.deleteAll();
		stageParamRepository.deleteAll();
	}

	@Test
	@Order(1)
	void findsTaskById() throws Exception {
		// quant il n'y a pas de parametrage la list est vide
		final String baseUrl = "http://localhost:" + randomServerPort;
		ResponseEntity<String> result = this.restTemplate.getForEntity(baseUrl + ResponseFileParamController.URL,
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
	public void responseFileParam() throws Exception {
		final String baseUrl = "http://localhost:" + randomServerPort;

		MultiValueMap<String, Object> restBody = new LinkedMultiValueMap<>();
		restBody.add("responseFileModel", new ClassPathResource("Etape 1 - Page 1.jpg"));

		ResponseFileParam responseFileParam = new ResponseFileParam();
		responseFileParam.setStage(1);
		responseFileParam.setPage(1);
		responseFileParam.setTemplate(readStringResourceFile("Etape 1 - Page 1.xtmpl"));
		ObjectMapper objectMapper = new ObjectMapper();
		restBody.add("responseFileParam", objectMapper.writeValueAsString(responseFileParam));

		ResponseEntity<String> result = this.restTemplate.postForEntity(baseUrl + ResponseFileParamController.URL,
				restBody, String.class);

		assertThat(result.getStatusCode(), equalTo(HttpStatus.OK));
		var body = JsonPath.parse(result.getBody());
		assertDoesNotThrow(() -> body.read("$.id"));
		String id = body.read("$.id");
		assertEquals(responseFileParam.getStage(), body.read("$.stage"));
		assertEquals(responseFileParam.getPage(), body.read("$.page"));
		assertEquals(responseFileParam.getTemplate(), body.read("$.template"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id, body.read("$._links.self.href"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id,
				body.read("$._links.responseFileParam.href"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id + "/template",
				body.read("$._links.responseFileTemplate.href"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id + "/model",
				body.read("$._links.responseFileModel.href"));

		ResponseEntity<String> result1 = this.restTemplate.getForEntity(baseUrl + ResponseFileParamController.URL,
				String.class);

		// Verify request succeed
		assertThat(result1.getStatusCode(), equalTo(HttpStatus.OK));
		var body1 = JsonPath.parse(result1.getBody());
		assertDoesNotThrow(() -> body1.read("$._links"));
		assertDoesNotThrow(() -> body1.read("$.page"));
		assertDoesNotThrow(() -> body1.read("$._embedded.responseFileParams"));
		List<Object> responseFileParams = body1.read("$._embedded.responseFileParams");
		assertEquals(1, responseFileParams.size());
		assertEquals(id, body1.read("$._embedded.responseFileParams[0].id"));
		assertEquals(responseFileParam.getStage(), body1.read("$._embedded.responseFileParams[0].stage"));
		assertEquals(responseFileParam.getPage(), body1.read("$._embedded.responseFileParams[0].page"));
		assertEquals(responseFileParam.getTemplate(), body1.read("$._embedded.responseFileParams[0].template"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id,
				body1.read("$._embedded.responseFileParams[0]._links.self.href"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id,
				body1.read("$._embedded.responseFileParams[0]._links.responseFileParam.href"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id + "/template",
				body1.read("$._embedded.responseFileParams[0]._links.responseFileTemplate.href"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id + "/model",
				body1.read("$._embedded.responseFileParams[0]._links.responseFileModel.href"));
	}

	@Test
	@Order(3)
	public void responseFileParamerror() throws Exception {
		final String baseUrl = "http://localhost:" + randomServerPort;

		MultiValueMap<String, Object> restBody = new LinkedMultiValueMap<>();
		restBody.add("responseFileModel", new ClassPathResource("Etape 1 - Page 2.jpg"));

		ResponseFileParam responseFileParam = new ResponseFileParam();
		responseFileParam.setStage(1);
		responseFileParam.setPage(2);
		responseFileParam.setTemplate(readStringResourceFile("Etape 1 - Page 2.xtmpl"));
		ObjectMapper objectMapper = new ObjectMapper();
		restBody.add("responseFileParam", objectMapper.writeValueAsString(responseFileParam));

		ResponseEntity<String> result = this.restTemplate.postForEntity(baseUrl + ResponseFileParamController.URL,
				restBody, String.class);

		assertThat(result.getStatusCode(), equalTo(HttpStatus.OK));
		var body = JsonPath.parse(result.getBody());
		assertDoesNotThrow(() -> body.read("$.id"));
		String id = body.read("$.id");
		assertEquals(responseFileParam.getStage(), body.read("$.stage"));
		assertEquals(responseFileParam.getPage(), body.read("$.page"));
		assertEquals(responseFileParam.getTemplate(), body.read("$.template"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id, body.read("$._links.self.href"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id,
				body.read("$._links.responseFileParam.href"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id + "/template",
				body.read("$._links.responseFileTemplate.href"));
		assertEquals(baseUrl + ResponseFileParamController.URL + "/" + id + "/model",
				body.read("$._links.responseFileModel.href"));

		ResponseEntity<String> result1 = this.restTemplate.postForEntity(baseUrl + ResponseFileParamController.URL,
				restBody, String.class);

		assertThat(result1.getStatusCode(), equalTo(HttpStatus.INTERNAL_SERVER_ERROR));
		var body1 = JsonPath.parse(result1.getBody());
		assertEquals(
				"E11000 duplicate key error collection: rallye-schema-test.responseFileParam index: stage_1_page_1 dup key: { : 1, : 2 }; nested exception is com.mongodb.MongoWriteException: E11000 duplicate key error collection: rallye-schema-test.responseFileParam index: stage_1_page_1 dup key: { : 1, : 2 }",
				body1.read("$.message"));
	}

	private String readStringResourceFile(String pathOnClassPath) throws Exception {
		return Files.readString(
				Paths.get(Thread.currentThread().getContextClassLoader().getResource(pathOnClassPath).toURI()));
	}
}
