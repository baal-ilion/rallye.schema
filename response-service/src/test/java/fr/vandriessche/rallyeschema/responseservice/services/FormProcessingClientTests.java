package fr.vandriessche.rallyeschema.responseservice.services;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class FormProcessingClientTests {

	@Test
	void returnsTheNormalizedImage() {
		RestTemplate restTemplate = new RestTemplate();
		MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
		byte[] normalized = "normalized-image".getBytes(StandardCharsets.UTF_8);
		server.expect(requestTo("http://processor:8080/api/v1/forms/process"))
				.andRespond(withSuccess("{"
						+ "\"status\":\"READY\","
						+ "\"automatic_marker_detection\":true,"
						+ "\"manual_review_required\":false,"
						+ "\"normalized_content_type\":\"image/png\","
						+ "\"normalized_image_base64\":\"" + Base64.getEncoder().encodeToString(normalized) + "\""
						+ "}", MediaType.APPLICATION_JSON));

		FormProcessingClient client = new FormProcessingClient(restTemplate, true, "http://processor:8080/");
		var result = client.process(new byte[] { 1, 2 }, "scan.jpg", "image/jpeg", null, null);

		assertTrue(result.isPresent());
		assertArrayEquals(normalized, result.get().getContent());
		assertEquals("png", result.get().getExtension());
		assertTrue(result.get().isAutomaticMarkerDetection());
		assertFalse(result.get().isManualReviewRequired());
		server.verify();
	}

	@Test
	void fallsBackWhenTheServiceIsUnavailable() {
		RestTemplate restTemplate = new RestTemplate();
		MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
		server.expect(requestTo("http://processor:8080/api/v1/forms/process")).andRespond(withServerError());

		FormProcessingClient client = new FormProcessingClient(restTemplate, true, "http://processor:8080");

		assertFalse(client.process(new byte[] { 1 }, "scan.jpg", "image/jpeg", null, null).isPresent());
		server.verify();
	}

	@Test
	void doesNotCallTheServiceWhenDisabled() {
		FormProcessingClient client = new FormProcessingClient(new RestTemplate(), false, "http://processor:8080");

		assertFalse(client.process(new byte[] { 1 }, "scan.jpg", "image/jpeg", null, null).isPresent());
	}
}
