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
		private int detectedRotationDegrees;
		private double referenceAlignmentError;
		private boolean localAlignmentApplied;
		private double localAlignmentConfidence;
		private int localAlignmentAnchorCount;
		private double localAlignmentMeanDisplacement;
		private double localAlignmentMaximumDisplacement;
		private MarkerSet targetMarkers;
		private Identification identification;
		private java.util.List<Correction> corrections;
	}

	@Data
	@NoArgsConstructor
	public static class Identification {
		private Integer team;
		private Integer stage;
		private Integer page;
		private double confidence;
	}

	@Data
	@NoArgsConstructor
	public static class Correction {
		private String label;
		@JsonProperty("marked_values")
		private java.util.List<String> markedValues;
		private boolean value;
		private double confidence;
	}

	@Data
	@AllArgsConstructor
	public static class PageRecognition {
		private byte[] content;
		private String contentType;
		private java.util.List<Correction> corrections;
	}

	@Data
	@NoArgsConstructor
	public static class MarkerPoint {
		private double x;
		private double y;
	}

	@Data
	@NoArgsConstructor
	public static class MarkerSet {
		@JsonProperty("top_left")
		private MarkerPoint topLeft;
		@JsonProperty("top_right")
		private MarkerPoint topRight;
		@JsonProperty("bottom_right")
		private MarkerPoint bottomRight;
		@JsonProperty("bottom_left")
		private MarkerPoint bottomLeft;
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
		@JsonProperty("detected_rotation_degrees")
		private int detectedRotationDegrees;
		@JsonProperty("reference_alignment_error")
		private double referenceAlignmentError;
		@JsonProperty("normalized_content_type")
		private String normalizedContentType;
		@JsonProperty("normalized_image_base64")
		private String normalizedImageBase64;
		@JsonProperty("local_alignment_applied")
		private boolean localAlignmentApplied;
		@JsonProperty("local_alignment_confidence")
		private double localAlignmentConfidence;
		@JsonProperty("local_alignment_anchor_count")
		private int localAlignmentAnchorCount;
		@JsonProperty("local_alignment_mean_displacement")
		private double localAlignmentMeanDisplacement;
		@JsonProperty("local_alignment_maximum_displacement")
		private double localAlignmentMaximumDisplacement;
		@JsonProperty("target_markers")
		private MarkerSet targetMarkers;
		private Identification identification;
		private java.util.List<Correction> corrections;
	}

	@Data
	@NoArgsConstructor
	@JsonIgnoreProperties(ignoreUnknown = true)
	private static class CorrectionResponse {
		private java.util.List<Correction> corrections;
		@JsonProperty("normalized_content_type")
		private String normalizedContentType;
		@JsonProperty("normalized_image_base64")
		private String normalizedImageBase64;
	}

	private final RestTemplate restTemplate;
	private final boolean enabled;
	private final String processUrl;
	private final String correctionsUrl;

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
		String baseUrl = serviceUrl.replaceAll("/+$", "");
		this.processUrl = baseUrl + "/api/v1/forms/process";
		this.correctionsUrl = baseUrl + "/api/v1/forms/recognize-corrections";
	}

	public Optional<ProcessedImage> process(byte[] image, String filename, String contentType,
			byte[] reference, String referenceContentType, String templateXml) {
		if (!enabled) {
			return Optional.empty();
		}
		try {
			MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
			parts.add("image", filePart(image, filename, contentType));
			if (reference != null && reference.length > 0) {
				parts.add("reference", filePart(reference, "reference.png", referenceContentType));
			}
			if (templateXml != null && !templateXml.isBlank()) {
				parts.add("template_xml", templateXml);
			}
			// La référence globale sert uniquement à l'orientation et à la
			// perspective. Le recalage non rigide est effectué ensuite avec le
			// modèle exact de l'épreuve et de la page.
			parts.add("apply_local_alignment", "false");

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
					response.isManualReviewRequired(),
					response.getDetectedRotationDegrees(),
					response.getReferenceAlignmentError(),
					response.isLocalAlignmentApplied(),
					response.getLocalAlignmentConfidence(),
					response.getLocalAlignmentAnchorCount(),
					response.getLocalAlignmentMeanDisplacement(),
					response.getLocalAlignmentMaximumDisplacement(),
					response.getTargetMarkers(),
					response.getIdentification(),
					Optional.ofNullable(response.getCorrections()).orElse(java.util.List.of())));
		} catch (RestClientException | IllegalArgumentException | IllegalStateException error) {
			log.warning("Service de traitement indisponible ou réponse inexploitable : utilisation du traitement "
					+ "historique. Cause : " + error.getMessage());
			return Optional.empty();
		}
	}

	public Optional<PageRecognition> recognizeCorrections(byte[] normalizedImage, String filename,
			String contentType, String templateXml, byte[] referenceImage, String referenceContentType) {
		if (!enabled || templateXml == null || templateXml.isBlank()) {
			return Optional.empty();
		}
		try {
			MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
			parts.add("image", filePart(normalizedImage, filename, contentType));
			if (referenceImage != null && referenceImage.length > 0) {
				parts.add("reference", filePart(referenceImage, "reference.png", referenceContentType));
			}
			parts.add("template_xml", templateXml);
			CorrectionResponse response = restTemplate.postForObject(correctionsUrl, parts, CorrectionResponse.class);
			if (response == null || response.getNormalizedImageBase64() == null) {
				return Optional.empty();
			}
			return Optional.of(new PageRecognition(
					Base64.getDecoder().decode(response.getNormalizedImageBase64()),
					Optional.ofNullable(response.getNormalizedContentType()).orElse(MediaType.IMAGE_PNG_VALUE),
					Optional.ofNullable(response.getCorrections()).orElse(java.util.List.of())));
		} catch (RestClientException | IllegalArgumentException | IllegalStateException error) {
			log.warning("Lecture comparative des corrections indisponible : " + error.getMessage());
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
