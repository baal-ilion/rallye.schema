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

		FormProcessingClient client = new FormProcessingClient(restTemplate, true, "http://processor:8080/");
		var result = client.process(new byte[] { 1, 2 }, "scan.jpg", "image/jpeg", null, null, "<template/>");

		assertTrue(result.isPresent());
		assertArrayEquals(normalized, result.get().getContent());
		assertEquals("png", result.get().getExtension());
		assertTrue(result.get().isAutomaticMarkerDetection());
		assertEquals(270, result.get().getDetectedRotationDegrees());
		assertEquals(0.95, result.get().getReferenceAlignmentError(), 0.001);
		assertEquals(10, result.get().getTargetMarkers().getTopLeft().getX(), 0.001);
		assertTrue(result.get().isLocalAlignmentApplied());
		assertEquals(0.81, result.get().getLocalAlignmentConfidence(), 0.001);
		assertEquals(22, result.get().getLocalAlignmentAnchorCount());
		assertEquals(1, result.get().getCorrections().size());
		assertEquals("Q1", result.get().getCorrections().get(0).getLabel());
		assertTrue(result.get().getCorrections().get(0).isValue());
		assertEquals(0.87, result.get().getCorrections().get(0).getConfidence(), 0.001);
		assertFalse(result.get().isManualReviewRequired());
		server.verify();
	}

	@Test
	void fallsBackWhenTheServiceIsUnavailable() {
		RestTemplate restTemplate = new RestTemplate();
		MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
		server.expect(requestTo("http://processor:8080/api/v1/forms/process")).andRespond(withServerError());

		FormProcessingClient client = new FormProcessingClient(restTemplate, true, "http://processor:8080");

		assertFalse(client.process(new byte[] { 1 }, "scan.jpg", "image/jpeg", null, null, null).isPresent());
		server.verify();
	}

	@Test
	void doesNotCallTheServiceWhenDisabled() {
		FormProcessingClient client = new FormProcessingClient(new RestTemplate(), false, "http://processor:8080");

		assertFalse(client.process(new byte[] { 1 }, "scan.jpg", "image/jpeg", null, null, null).isPresent());
	}

	@Test
	void readsCorrectionsWithoutRequestingANewNormalization() {
		RestTemplate restTemplate = new RestTemplate();
		MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
		server.expect(requestTo("http://processor:8080/api/v1/forms/recognize-corrections"))
				.andRespond(withSuccess("{\"corrections\":[{\"label\":\"Q1\","
						+ "\"marked_values\":[\"N\",\"Y\"],\"value\":false,\"confidence\":0.75}],"
						+ "\"normalized_content_type\":\"image/png\","
						+ "\"normalized_image_base64\":\"AQI=\"}",
						MediaType.APPLICATION_JSON));

		FormProcessingClient client = new FormProcessingClient(restTemplate, true, "http://processor:8080");
		var recognition = client.recognizeCorrections(new byte[] { 1 }, "normalized.png", "image/png",
				"<template/>", new byte[] { 2 }, "image/png");
		var corrections = recognition.orElseThrow().getCorrections();
		assertArrayEquals(new byte[] { 1, 2 }, recognition.orElseThrow().getContent());

		assertEquals(1, corrections.size());
		assertEquals("Q1", corrections.get(0).getLabel());
		assertEquals(java.util.List.of("N", "Y"), corrections.get(0).getMarkedValues());
		assertFalse(corrections.get(0).isValue());
		server.verify();
	}
}
