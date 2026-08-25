package fr.vandriessche.rallyeschema.coreservice.services;

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

@Service
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
		private double[][] sourceToNormalizedTransform;
		private Identification identification;
		private java.util.List<Correction> corrections;
	}

	@Data
	@NoArgsConstructor
	public static class Identification {
		private Integer team;
		private Integer challenge;
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
		@JsonProperty("source_to_normalized_transform")
		private double[][] sourceToNormalizedTransform;
		private Identification identification;
		private java.util.List<Correction> corrections;
	}

	private final RestTemplate restTemplate;
	private final String interactiveProcessUrl;
	private final String backgroundProcessUrl;

	@Autowired
	public FormProcessingClient(RestTemplateBuilder builder,
			@Value("${form-processing.url:http://localhost:8085}") String serviceUrl,
			@Value("${form-processing.batch-url:${form-processing.url:http://localhost:8085}}") String batchServiceUrl) {
		this(builder.setConnectTimeout(java.time.Duration.ofSeconds(3))
				.setReadTimeout(java.time.Duration.ofSeconds(30)).build(), serviceUrl, batchServiceUrl);
	}

	FormProcessingClient(RestTemplate restTemplate, String serviceUrl) {
		this(restTemplate, serviceUrl, serviceUrl);
	}

	FormProcessingClient(RestTemplate restTemplate, String serviceUrl, String batchServiceUrl) {
		this.restTemplate = restTemplate;
		this.interactiveProcessUrl = processUrl(serviceUrl);
		this.backgroundProcessUrl = processUrl(batchServiceUrl);
	}

	public ProcessedImage process(byte[] image, String filename, String contentType,
			byte[] reference, String referenceContentType, String templateXml) {
		return process(interactiveProcessUrl, image, filename, contentType, reference, referenceContentType,
				templateXml, null, true, true);
	}

	public ProcessedImage identify(byte[] image, String filename, String contentType,
			byte[] reference, String referenceContentType, String templateXml) {
		return process(interactiveProcessUrl, image, filename, contentType, reference, referenceContentType,
				templateXml, null, false, true);
	}

	public ProcessedImage identifyInBackground(byte[] image, String filename, String contentType,
			byte[] reference, String referenceContentType, String templateXml) {
		return process(backgroundProcessUrl, image, filename, contentType, reference, referenceContentType,
				templateXml, null, false, true);
	}

	public ProcessedImage processInBackground(byte[] image, String filename, String contentType,
			byte[] reference, String referenceContentType, String templateXml) {
		return process(backgroundProcessUrl, image, filename, contentType, reference, referenceContentType,
				templateXml, null, true, true);
	}

	public ProcessedImage processWithMarkers(byte[] image, String filename, String contentType,
			byte[] reference, String referenceContentType, String templateXml, MarkerSet sourceMarkers) {
		return process(interactiveProcessUrl, image, filename, contentType, reference, referenceContentType,
				templateXml, sourceMarkers,
				true, false);
	}

	public ProcessedImage identifyWithMarkers(byte[] image, String filename, String contentType,
			byte[] reference, String referenceContentType, String templateXml, MarkerSet sourceMarkers) {
		return process(interactiveProcessUrl, image, filename, contentType, reference, referenceContentType,
				templateXml, sourceMarkers,
				false, false);
	}

	private ProcessedImage process(String processUrl, byte[] image, String filename, String contentType,
			byte[] reference, String referenceContentType, String templateXml, MarkerSet sourceMarkers,
			boolean recognizeCorrectionMarks, boolean includeNormalizedImage) {
		try {
			MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
			parts.add("image", filePart(image, filename, contentType));
			if (reference != null && reference.length > 0) {
				parts.add("reference", filePart(reference, "reference.png", referenceContentType));
			}
			if (templateXml != null && !templateXml.isBlank()) {
				parts.add("template_xml", templateXml);
			}
			if (sourceMarkers != null) {
				parts.add("source_markers", markerSetJson(sourceMarkers));
			}
			parts.add("recognize_correction_marks", Boolean.toString(recognizeCorrectionMarks));
			parts.add("include_normalized_image", Boolean.toString(includeNormalizedImage));
			// La référence globale sert uniquement à l'orientation et à la
			// perspective. Le recalage non rigide est effectué ensuite avec le
			// modèle exact de l'épreuve et de la page.
			parts.add("apply_local_alignment", "false");

			ProcessingResponse response = restTemplate.postForObject(processUrl, parts, ProcessingResponse.class);
			if (response == null || (includeNormalizedImage && response.getNormalizedImageBase64() == null)) {
				throw new IllegalStateException("Le service de traitement n'a retourné aucune image.");
			}
			return new ProcessedImage(
					response.getNormalizedImageBase64() == null ? new byte[0]
							: Base64.getDecoder().decode(response.getNormalizedImageBase64()),
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
					response.getSourceToNormalizedTransform(),
					response.getIdentification(),
					Optional.ofNullable(response.getCorrections()).orElse(java.util.List.of()));
		} catch (RestClientException | IllegalArgumentException | IllegalStateException error) {
			throw new IllegalStateException("Service de traitement indisponible ou réponse inexploitable : "
					+ error.getMessage(), error);
		}
	}

	private String processUrl(String serviceUrl) {
		return serviceUrl.replaceAll("/+$", "") + "/api/v1/forms/process";
	}

	private String markerSetJson(MarkerSet markers) {
		return String.format(java.util.Locale.ROOT,
				"{\"top_left\":{\"x\":%.6f,\"y\":%.6f},"
						+ "\"top_right\":{\"x\":%.6f,\"y\":%.6f},"
						+ "\"bottom_right\":{\"x\":%.6f,\"y\":%.6f},"
						+ "\"bottom_left\":{\"x\":%.6f,\"y\":%.6f}}",
				markers.getTopLeft().getX(), markers.getTopLeft().getY(),
				markers.getTopRight().getX(), markers.getTopRight().getY(),
				markers.getBottomRight().getX(), markers.getBottomRight().getY(),
				markers.getBottomLeft().getX(), markers.getBottomLeft().getY());
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
