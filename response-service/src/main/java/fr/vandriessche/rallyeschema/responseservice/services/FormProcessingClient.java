package fr.vandriessche.rallyeschema.responseservice.services;

import java.util.Base64;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.java.Log;

@Service
@Log
public class FormProcessingClient {

	@Data
	@AllArgsConstructor
	public static class ProcessedImage {
		private byte[] content;
		private String contentType;
		private String extension;
		private String status;
		private boolean automaticMarkerDetection;
		private boolean manualReviewRequired;
	}

	@Data
	@NoArgsConstructor
	@JsonIgnoreProperties(ignoreUnknown = true)
	private static class ProcessingResponse {
		private String status;
		@JsonProperty("manual_review_required")
		private boolean manualReviewRequired;
		@JsonProperty("automatic_marker_detection")
		private boolean automaticMarkerDetection;
		@JsonProperty("normalized_content_type")
		private String normalizedContentType;
		@JsonProperty("normalized_image_base64")
		private String normalizedImageBase64;
	}

	private final RestTemplate restTemplate;
	private final boolean enabled;
	private final String processUrl;

	@Autowired
	public FormProcessingClient(RestTemplateBuilder builder,
			@Value("${form-processing.enabled:false}") boolean enabled,
			@Value("${form-processing.url:http://localhost:8085}") String serviceUrl) {
		this(builder.setConnectTimeout(java.time.Duration.ofSeconds(3))
				.setReadTimeout(java.time.Duration.ofSeconds(30)).build(), enabled, serviceUrl);
	}

	FormProcessingClient(RestTemplate restTemplate, boolean enabled, String serviceUrl) {
		this.restTemplate = restTemplate;
		this.enabled = enabled;
		this.processUrl = serviceUrl.replaceAll("/+$", "") + "/api/v1/forms/process";
	}

	public Optional<ProcessedImage> process(byte[] image, String filename, String contentType,
			byte[] reference, String referenceContentType) {
		if (!enabled) {
			return Optional.empty();
		}
		try {
			MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
			parts.add("image", filePart(image, filename, contentType));
			if (reference != null && reference.length > 0) {
				parts.add("reference", filePart(reference, "reference.png", referenceContentType));
			}

			ProcessingResponse response = restTemplate.postForObject(processUrl, parts, ProcessingResponse.class);
			if (response == null || response.getNormalizedImageBase64() == null) {
				throw new IllegalStateException("Le service de traitement n'a retourné aucune image.");
			}
			return Optional.of(new ProcessedImage(
					Base64.getDecoder().decode(response.getNormalizedImageBase64()),
					Optional.ofNullable(response.getNormalizedContentType()).orElse(MediaType.IMAGE_PNG_VALUE),
					"png",
					response.getStatus(),
					response.isAutomaticMarkerDetection(),
					response.isManualReviewRequired()));
		} catch (RestClientException | IllegalArgumentException | IllegalStateException error) {
			log.warning("Service de traitement indisponible ou réponse inexploitable : utilisation du traitement "
					+ "historique. Cause : " + error.getMessage());
			return Optional.empty();
		}
	}

	private HttpEntity<ByteArrayResource> filePart(byte[] content, String filename, String contentType) {
		ByteArrayResource resource = new ByteArrayResource(content) {
			@Override
			public String getFilename() {
				return filename;
			}
		};
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.parseMediaType(
				contentType == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : contentType));
		return new HttpEntity<>(resource, headers);
	}
}
