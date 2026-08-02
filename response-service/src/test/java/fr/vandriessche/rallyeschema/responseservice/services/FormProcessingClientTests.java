package fr.vandriessche.rallyeschema.responseservice.services;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
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
						+ "\"detected_rotation_degrees\":270,"
						+ "\"reference_alignment_error\":0.95,"
						+ "\"local_alignment_applied\":true,"
						+ "\"local_alignment_confidence\":0.81,"
						+ "\"local_alignment_anchor_count\":22,"
						+ "\"local_alignment_mean_displacement\":2.4,"
						+ "\"local_alignment_maximum_displacement\":6.7,"
						+ "\"target_markers\":{"
						+ "\"top_left\":{\"x\":10,\"y\":20},"
						+ "\"top_right\":{\"x\":90,\"y\":20},"
						+ "\"bottom_right\":{\"x\":90,\"y\":180},"
						+ "\"bottom_left\":{\"x\":10,\"y\":180}},"
						+ "\"corrections\":[{\"label\":\"Q1\",\"marked_values\":[\"Y\"],"
						+ "\"value\":true,\"confidence\":0.87}],"
						+ "\"normalized_content_type\":\"image/png\","
						+ "\"normalized_image_base64\":\"" + Base64.getEncoder().encodeToString(normalized) + "\""
						+ "}", MediaType.APPLICATION_JSON));

		FormProcessingClient client = new FormProcessingClient(restTemplate, "http://processor:8080/");
		var result = client.process(new byte[] { 1, 2 }, "scan.jpg", "image/jpeg", null, null, "<template/>");

		assertArrayEquals(normalized, result.getContent());
		assertEquals("png", result.getExtension());
		assertTrue(result.isAutomaticMarkerDetection());
		assertEquals(270, result.getDetectedRotationDegrees());
		assertEquals(0.95, result.getReferenceAlignmentError(), 0.001);
		assertEquals(10, result.getTargetMarkers().getTopLeft().getX(), 0.001);
		assertTrue(result.isLocalAlignmentApplied());
		assertEquals(0.81, result.getLocalAlignmentConfidence(), 0.001);
		assertEquals(22, result.getLocalAlignmentAnchorCount());
		assertEquals(1, result.getCorrections().size());
		assertEquals("Q1", result.getCorrections().get(0).getLabel());
		assertTrue(result.getCorrections().get(0).isValue());
		assertEquals(0.87, result.getCorrections().get(0).getConfidence(), 0.001);
		assertFalse(result.isManualReviewRequired());
		server.verify();
	}

	@Test
	void failsWhenTheServiceIsUnavailable() {
		RestTemplate restTemplate = new RestTemplate();
		MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
		server.expect(requestTo("http://processor:8080/api/v1/forms/process")).andRespond(withServerError());

		FormProcessingClient client = new FormProcessingClient(restTemplate, "http://processor:8080");

		assertThrows(IllegalStateException.class,
				() -> client.process(new byte[] { 1 }, "scan.jpg", "image/jpeg", null, null, null));
		server.verify();
	}

	@Test
	void sendsUserSuppliedMarkersForManualRecalculation() {
		RestTemplate restTemplate = new RestTemplate();
		MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
		server.expect(requestTo("http://processor:8080/api/v1/forms/process"))
				.andExpect(content().string(containsString("name=\"source_markers\"")))
				.andExpect(content().string(containsString("\"top_left\":{\"x\":10.000000,\"y\":20.000000}")))
				.andRespond(withSuccess("{\"status\":\"READY\",\"normalized_image_base64\":\"AQI=\"}",
						MediaType.APPLICATION_JSON));

		FormProcessingClient.MarkerSet markers = new FormProcessingClient.MarkerSet();
		markers.setTopLeft(marker(10, 20));
		markers.setTopRight(marker(90, 20));
		markers.setBottomRight(marker(90, 180));
		markers.setBottomLeft(marker(10, 180));
		FormProcessingClient client = new FormProcessingClient(restTemplate, "http://processor:8080");

		client.processWithMarkers(new byte[] { 1 }, "scan.png", "image/png", null, null, null, markers);
		server.verify();
	}

	private FormProcessingClient.MarkerPoint marker(double x, double y) {
		FormProcessingClient.MarkerPoint marker = new FormProcessingClient.MarkerPoint();
		marker.setX(x);
		marker.setY(y);
		return marker;
	}

}
