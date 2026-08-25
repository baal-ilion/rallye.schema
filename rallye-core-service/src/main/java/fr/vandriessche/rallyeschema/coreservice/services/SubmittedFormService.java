package fr.vandriessche.rallyeschema.coreservice.services;

import java.awt.image.BufferedImage;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.time.Instant;
import java.util.logging.Level;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.imageio.ImageIO;
import javax.xml.parsers.ParserConfigurationException;

import org.apache.commons.io.FilenameUtils;
import org.bson.BsonBinarySubType;
import org.bson.types.Binary;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import fr.vandriessche.rallyeschema.coreservice.entities.Corners;
import fr.vandriessche.rallyeschema.coreservice.entities.FormGroup;
import fr.vandriessche.rallyeschema.coreservice.entities.FormPoint;
import fr.vandriessche.rallyeschema.coreservice.entities.FormQuestion;
import fr.vandriessche.rallyeschema.coreservice.entities.FormTemplate;
import fr.vandriessche.rallyeschema.coreservice.entities.PerformanceResult;
import fr.vandriessche.rallyeschema.coreservice.entities.QuestionType;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedForm;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormSource;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormSummary;
import fr.vandriessche.rallyeschema.coreservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.coreservice.repositories.SubmittedFormMetadataRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.SubmittedFormRepository;
import lombok.extern.java.Log;

@Service
@Log
public class SubmittedFormService {
	public static final String SUBMITTED_FORM_CREATE_EVENT = "submittedForm.create";
	public static final String SUBMITTED_FORM_UPDATE_EVENT = "submittedForm.update";
	public static final String SUBMITTED_FORM_DELETE_EVENT = "submittedForm.delete";

	private static final String PAGE = "Page";
	private static final String CHALLENGE = "Challenge";
	private static final String CHALLENGE_TENS = "ChallengeTens";
	private static final String CHALLENGE_UNITS = "ChallengeUnits";
	private static final String TEAM_UNITS = "TeamUnits";
	private static final String TEAM_TENS = "TeamTens";

	private static Double parseDouble(String v) {
		try {
			return Double.parseDouble(v);
		} catch (NumberFormatException | NullPointerException e) {
			log.log(Level.WARNING, "parseDouble", e);
		}
		return null;
	}

	@Autowired
	private SubmittedFormRepository submittedFormRepository;
	@Autowired
	private MongoTemplate mongoTemplate;

	@Autowired
	private SubmittedFormMetadataRepository submittedFormMetadataRepository;
	@Autowired
	private FormRecognitionConfigurationService formRecognitionConfigurationService;
	@Autowired
	private FormProcessingClient formProcessingClient;
	@Autowired
	private ChallengeConfigurationService challengeConfigurationService;

	@Autowired
	private MessageProducerService messageProducerService;
	@Autowired
	private SubmittedFormQueueUpdatePublisher queueUpdatePublisher;

	public SubmittedForm addSubmittedForm(MultipartFile file)
			throws IOException, ParserConfigurationException, SAXException {
		return addSubmittedForm(file, null);
	}

	public SubmittedForm addSubmittedForm(MultipartFile file, String uploadId)
			throws IOException, ParserConfigurationException, SAXException {
		String contentType = file.getContentType();
		if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
			throw new IllegalArgumentException("Only image files are supported");
		}

		if (uploadId != null && !uploadId.isBlank()) {
			SubmittedFormMetadata existing = submittedFormMetadataRepository.findByUploadId(uploadId).orElse(null);
			if (existing != null)
				return submittedFormRepository.findById(existing.getId()).orElseThrow();
		}
		byte[] originalContent = file.getBytes();
		SubmittedFormMetadata metadata = new SubmittedFormMetadata();
		metadata.setUploadId(uploadId == null || uploadId.isBlank() ? null : uploadId);
		metadata.setProcessingStatus("QUEUED");
		metadata.setProcessingCreatedAt(Instant.now());
		metadata = submittedFormMetadataRepository.save(metadata);
		SubmittedForm submittedForm = new SubmittedForm();
		submittedForm.setId(metadata.getId());
		submittedForm.setMetadata(metadata);
		// L'original reste disponible pendant et après le traitement.
		submittedForm.setFile(new Binary(BsonBinarySubType.BINARY, originalContent));
		submittedForm.setFileExtension(FilenameUtils.getExtension(file.getOriginalFilename()));
		submittedForm.setFileType(contentType);
		submittedForm.setOriginalFile(new Binary(BsonBinarySubType.BINARY, originalContent));
		submittedForm.setOriginalFileExtension(FilenameUtils.getExtension(file.getOriginalFilename()));
		submittedForm.setOriginalFileType(contentType);
		SubmittedForm inserted = submittedFormRepository.insert(submittedForm);
		queueUpdatePublisher.publishUpdate();
		return inserted;
	}

	public void processQueuedSubmittedForm(String id)
			throws IOException, ParserConfigurationException, SAXException {
		SubmittedForm submittedForm = submittedFormRepository.findById(id).orElseThrow();
		byte[] originalContent = submittedForm.getOriginalFile().getData();
		String originalName = id + "." + submittedForm.getOriginalFileExtension();
		String contentType = submittedForm.getOriginalFileType();
		var reference = formRecognitionConfigurationService.getReferenceFormReferenceImage().orElse(null);
		var processed = formProcessingClient.identifyInBackground(
				originalContent,
				originalName,
				contentType,
				Objects.nonNull(reference) ? reference.getFile().getData() : null,
				Objects.nonNull(reference) ? reference.getFileType() : null,
				Objects.nonNull(reference) && Objects.nonNull(reference.getConfiguration())
						? reference.getConfiguration().getTemplate() : null);
		updateSubmittedFormFromProcessing(submittedForm, originalName, contentType, processed);
	}

	public SubmittedFormMetadata retryProcessing(String id) {
		SubmittedFormMetadata metadata = submittedFormMetadataRepository.findById(id).orElseThrow();
		if (!"ERROR".equals(metadata.getProcessingStatus()))
			return metadata;
		metadata.setProcessingStatus("QUEUED");
		metadata.setProcessingError(null);
		metadata.setProcessingStartedAt(null);
		metadata.setProcessingCompletedAt(null);
		SubmittedFormMetadata saved = submittedFormMetadataRepository.save(metadata);
		queueUpdatePublisher.publishUpdate();
		return saved;
	}

	private void updateSubmittedFormFromProcessing(SubmittedForm submittedForm, String originalName, String contentType,
			FormProcessingClient.ProcessedImage genericResult)
			throws IOException, ParserConfigurationException, SAXException {
		String name = FilenameUtils.getBaseName(originalName);
		SubmittedFormMetadata metadata = submittedFormMetadataRepository.findById(submittedForm.getId()).orElseThrow();
		var identification = genericResult.getIdentification();
		if (Objects.nonNull(identification)) {
			metadata.setTeam(identification.getTeam());
			metadata.setChallenge(identification.getChallenge());
			metadata.setPage(identification.getPage());
		}

		FormProcessingClient.ProcessedImage pageResult = genericResult;
		boolean exactTemplateUsed = false;
		if (Objects.nonNull(metadata.getChallenge()) && Objects.nonNull(metadata.getPage())) {
			var exactConfiguration = formRecognitionConfigurationService
					.getFormRecognitionConfigurationByChallengeAndPage(metadata.getChallenge(), metadata.getPage()).orElse(null);
			if (Objects.nonNull(exactConfiguration) && Objects.nonNull(exactConfiguration.getTemplate())) {
				var exactReferenceImage = formRecognitionConfigurationService.getFormReferenceImage(exactConfiguration.getId());
				if (Objects.nonNull(exactReferenceImage) && Objects.nonNull(exactReferenceImage.getFile())) {
					pageResult = formProcessingClient.processInBackground(
							submittedForm.getOriginalFile().getData(), originalName, contentType,
							exactReferenceImage.getFile().getData(), exactReferenceImage.getFileType(), exactConfiguration.getTemplate());
					exactTemplateUsed = true;
				}
			}
		}

		BufferedImage image = ImageIO.read(new ByteArrayInputStream(pageResult.getContent()));
		if (Objects.isNull(image))
			throw new IllegalStateException("Le service de traitement n'a retourné aucune image exploitable.");
		HashMap<Corners, FormPoint> corners = makeTrustedCorners(pageResult);
		FormTemplate filledForm = makeEmptyProcessedFormTemplate(image, name,
				exactTemplateUsed ? metadata.getChallenge() : null,
				exactTemplateUsed ? metadata.getPage() : null, corners);
		metadata.setFilledForm(filledForm);
		if (exactTemplateUsed)
			applyProcessingCorrections(metadata, pageResult.getCorrections());
		applyIdentificationMarks(filledForm, metadata.getTeam(), metadata.getChallenge(), metadata.getPage(), null);
		copyProcessingMetadata(metadata, pageResult);
		boolean incompleteIdentification = Objects.isNull(identification)
				|| Objects.isNull(metadata.getTeam()) || Objects.isNull(metadata.getChallenge()) || Objects.isNull(metadata.getPage())
				|| identification.getConfidence() < 0.60 || !exactTemplateUsed;
		if (incompleteIdentification) {
			metadata.setManualReviewRequired(true);
			if ("READY".equals(metadata.getProcessingStatus()))
				metadata.setProcessingStatus("READY_WITH_WARNINGS");
		}

		metadata.setProcessingError(null);
		metadata.setProcessingCompletedAt(Instant.now());
		metadata = submittedFormMetadataRepository.save(metadata);
		submittedForm.setMetadata(metadata);
		submittedForm.setFile(new Binary(BsonBinarySubType.BINARY, pageResult.getContent()));
		submittedForm.setFileExtension("png");
		submittedForm.setFileType(pageResult.getContentType());
		submittedForm.setThumbnail(new Binary(BsonBinarySubType.BINARY, makeThumbnail(image)));
		submittedForm.setThumbnailType("image/jpeg");
		submittedFormRepository.save(submittedForm);
		messageProducerService.sendMessage(SUBMITTED_FORM_CREATE_EVENT, metadata);
		queueUpdatePublisher.publishUpdate();
	}

	private void copyProcessingMetadata(SubmittedFormMetadata metadata, FormProcessingClient.ProcessedImage result) {
		metadata.setProcessingStatus(result.getStatus());
		metadata.setAutomaticMarkerDetection(result.isAutomaticMarkerDetection());
		metadata.setManualReviewRequired(result.isManualReviewRequired());
		metadata.setDetectedRotationDegrees(result.getDetectedRotationDegrees());
		metadata.setReferenceAlignmentError(result.getReferenceAlignmentError());
		metadata.setLocalAlignmentApplied(result.isLocalAlignmentApplied());
		metadata.setLocalAlignmentConfidence(result.getLocalAlignmentConfidence());
		metadata.setLocalAlignmentAnchorCount(result.getLocalAlignmentAnchorCount());
		metadata.setLocalAlignmentMeanDisplacement(result.getLocalAlignmentMeanDisplacement());
		metadata.setLocalAlignmentMaximumDisplacement(result.getLocalAlignmentMaximumDisplacement());
	}

	void applyProcessingCorrections(SubmittedFormMetadata metadata,
			java.util.List<FormProcessingClient.Correction> corrections) {
		applyProcessingCorrections(metadata, corrections, null);
	}

	private void applyProcessingCorrections(SubmittedFormMetadata metadata,
			java.util.List<FormProcessingClient.Correction> corrections, double[][] sourceToNormalizedTransform) {
		corrections.forEach(correction ->
				applyCorrectionMarks(metadata.getFilledForm(), correction, sourceToNormalizedTransform));
	}

	private void applyCorrectionMarks(FormTemplate form, FormProcessingClient.Correction correction,
			double[][] sourceToNormalizedTransform) {
		FormQuestion question = findQuestion(form, correction.getLabel());
		if (Objects.isNull(question))
			return;

		HashMap<String, FormPoint> existingPoints = new HashMap<>(question.getPoints());
		question.getPoints().clear();
		if (Objects.isNull(correction.getMarkedValues()))
			return;

		FormQuestion templateQuestion = Objects.nonNull(form.getParentTemplate())
				? findQuestion(form.getParentTemplate(), correction.getLabel())
				: null;
		correction.getMarkedValues().forEach(mark -> {
			FormPoint source = Objects.nonNull(templateQuestion) ? templateQuestion.getPoints().get(mark) : null;
			if (Objects.isNull(source))
				source = existingPoints.get(mark);
			if (Objects.nonNull(source))
				question.getPoints().put(mark, mapToSource(source, sourceToNormalizedTransform));
		});
	}

	private FormPoint mapToSource(FormPoint point, double[][] sourceToNormalizedTransform) {
		if (sourceToNormalizedTransform == null || sourceToNormalizedTransform.length != 3)
			return new FormPoint(point.getX(), point.getY());
		double[][] inverse = invert3x3(sourceToNormalizedTransform);
		if (inverse == null)
			return new FormPoint(point.getX(), point.getY());
		double denominator = inverse[2][0] * point.getX() + inverse[2][1] * point.getY() + inverse[2][2];
		if (Math.abs(denominator) < 1e-9)
			return new FormPoint(point.getX(), point.getY());
		return new FormPoint(
				(inverse[0][0] * point.getX() + inverse[0][1] * point.getY() + inverse[0][2]) / denominator,
				(inverse[1][0] * point.getX() + inverse[1][1] * point.getY() + inverse[1][2]) / denominator);
	}

	private double[][] invert3x3(double[][] matrix) {
		if (matrix[0].length != 3 || matrix[1].length != 3 || matrix[2].length != 3)
			return null;
		double determinant = matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1])
				- matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])
				+ matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
		if (Math.abs(determinant) < 1e-12)
			return null;
		return new double[][] {
				{ (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) / determinant,
						(matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) / determinant,
						(matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) / determinant },
				{ (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) / determinant,
						(matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) / determinant,
						(matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) / determinant },
				{ (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) / determinant,
						(matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) / determinant,
						(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) / determinant } };
	}

	private FormQuestion findQuestion(FormTemplate form, String label) {
		if (Objects.isNull(form) || Objects.isNull(label))
			return null;
		return form.getGroups().values().stream()
				.map(group -> group.getFields().get(label))
				.filter(Objects::nonNull)
				.findFirst()
				.orElse(null);
	}

	private HashMap<Corners, FormPoint> makeTrustedCorners(FormProcessingClient.ProcessedImage processed) {
		var markers = processed.getTargetMarkers();
		HashMap<Corners, FormPoint> corners = new HashMap<>();
		corners.put(Corners.TOP_LEFT, makeFormPoint(markers.getTopLeft()));
		corners.put(Corners.TOP_RIGHT, makeFormPoint(markers.getTopRight()));
		corners.put(Corners.BOTTOM_RIGHT, makeFormPoint(markers.getBottomRight()));
		corners.put(Corners.BOTTOM_LEFT, makeFormPoint(markers.getBottomLeft()));
		return corners;
	}

	private FormPoint makeFormPoint(FormProcessingClient.MarkerPoint marker) {
		FormPoint point = new FormPoint();
		point.setX(marker.getX());
		point.setY(marker.getY());
		return point;
	}

	public void deleteByTeam(Integer team) {
		submittedFormMetadataRepository.findByTeam(team).forEach(submittedFormMetadata -> deleteSubmittedForm(submittedFormMetadata));
	}

	public void deleteByChallenge(Integer challenge) {
		submittedFormMetadataRepository.findByChallenge(challenge).forEach(this::deleteSubmittedForm);
	}

	public void deleteByChallengeAndTeam(Integer challenge, Integer team) {
		submittedFormMetadataRepository.findByChallengeAndTeam(challenge, team)
				.forEach(submittedFormMetadata -> deleteSubmittedForm(submittedFormMetadata));
	}

	public void deleteSubmittedForm(String id) {
		SubmittedFormMetadata submittedFormMetadata = submittedFormMetadataRepository.findById(id).orElseThrow();
		deleteSubmittedForm(submittedFormMetadata);
	}

	public Page<SubmittedFormMetadata> getNotCheckedSubmittedFormMetadatas(Pageable pageable, String leaseOwner) {
		Instant now = Instant.now();
		Criteria unchecked = new Criteria().orOperator(Criteria.where("checked").is(false),
				Criteria.where("checked").is(null));
		Criteria ready = Criteria.where("processingStatus").in("READY", "READY_WITH_WARNINGS", null);
		Criteria available = new Criteria().orOperator(Criteria.where("verificationLeaseOwner").is(null),
				Criteria.where("verificationLeaseExpiresAt").lt(now),
				Criteria.where("verificationLeaseOwner").is(leaseOwner));
		Query query = Query.query(new Criteria().andOperator(unchecked, ready, available));
		long total = mongoTemplate.count(query, SubmittedFormMetadata.class);
		query.with(pageable);
		return new PageImpl<>(mongoTemplate.find(query, SubmittedFormMetadata.class), pageable, total);
	}

	public Page<SubmittedFormSummary> getProcessingQueue(Pageable pageable, String status, String leaseOwner) {
		Criteria unchecked = new Criteria().orOperator(Criteria.where("checked").is(false),
				Criteria.where("checked").is(null));
		Query query = Query.query(unchecked);
		if (status != null && !status.isBlank()) {
			if ("READY".equals(status))
				query.addCriteria(Criteria.where("processingStatus").in("READY", "READY_WITH_WARNINGS", null));
			else
				query.addCriteria(Criteria.where("processingStatus").is(status));
		}
		long total = mongoTemplate.count(query, SubmittedFormMetadata.class);
		query.fields().include("challenge").include("page").include("team").include("processingStatus")
				.include("processingError").include("manualReviewRequired")
				.include("verificationLeaseOwner").include("verificationLeaseExpiresAt");
		query.with(pageable);
		Instant now = Instant.now();
		List<SubmittedFormSummary> summaries = mongoTemplate.find(query, SubmittedFormMetadata.class).stream().map(metadata -> {
			boolean leaseActive = metadata.getVerificationLeaseOwner() != null
					&& metadata.getVerificationLeaseExpiresAt() != null
					&& metadata.getVerificationLeaseExpiresAt().isAfter(now);
			boolean mine = leaseActive && metadata.getVerificationLeaseOwner().equals(leaseOwner);
			return new SubmittedFormSummary(metadata.getId(), metadata.getChallenge(), metadata.getPage(), metadata.getTeam(),
					metadata.getProcessingStatus(), metadata.getProcessingError(), metadata.getManualReviewRequired(),
					!leaseActive || mine, mine);
		}).collect(Collectors.toList());
		return new PageImpl<>(summaries, pageable, total);
	}

	private byte[] makeThumbnail(BufferedImage source) throws IOException {
		int targetWidth = Math.min(240, source.getWidth());
		int targetHeight = Math.max(1, (int) Math.round(source.getHeight() * (targetWidth / (double) source.getWidth())));
		BufferedImage thumbnail = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
		Graphics2D graphics = thumbnail.createGraphics();
		try {
			graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
			graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
		} finally {
			graphics.dispose();
		}
		ByteArrayOutputStream output = new ByteArrayOutputStream();
		ImageIO.write(thumbnail, "jpg", output);
		return output.toByteArray();
	}

	public synchronized SubmittedForm getSubmittedFormWithCompactThumbnail(String id) {
		SubmittedForm submittedForm = getSubmittedForm(id);
		try {
			byte[] currentData = submittedForm.getThumbnail() != null ? submittedForm.getThumbnail().getData() : null;
			BufferedImage current = currentData != null ? ImageIO.read(new ByteArrayInputStream(currentData)) : null;
			if (current == null || current.getWidth() > 240 || !"image/jpeg".equals(submittedForm.getThumbnailType())) {
				BufferedImage source = current != null ? current
						: ImageIO.read(new ByteArrayInputStream(submittedForm.getFile().getData()));
				if (source != null) {
					submittedForm.setThumbnail(new Binary(BsonBinarySubType.BINARY, makeThumbnail(source)));
					submittedForm.setThumbnailType("image/jpeg");
					submittedForm = submittedFormRepository.save(submittedForm);
				}
			}
		} catch (IOException exception) {
			log.warning("Impossible de compacter la miniature " + id + " : " + exception.getMessage());
		}
		return submittedForm;
	}

	public SubmittedFormMetadata claimForVerification(String id, String owner) {
		if (owner == null || owner.isBlank())
			throw new IllegalArgumentException("L'identifiant de l'appareil est obligatoire.");
		Instant now = Instant.now();
		Query query = Query.query(new Criteria().andOperator(Criteria.where("id").is(id),
				new Criteria().orOperator(Criteria.where("verificationLeaseOwner").is(null),
						Criteria.where("verificationLeaseExpiresAt").lt(now),
						Criteria.where("verificationLeaseOwner").is(owner))));
		Update update = new Update().set("verificationLeaseOwner", owner)
				.set("verificationLeaseExpiresAt", now.plus(90, java.time.temporal.ChronoUnit.SECONDS));
		SubmittedFormMetadata claimed = mongoTemplate.findAndModify(query, update,
				FindAndModifyOptions.options().returnNew(true), SubmittedFormMetadata.class);
		if (claimed == null)
			throw new IllegalStateException("Ce formulaire est déjà vérifié sur un autre appareil.");
		queueUpdatePublisher.publishUpdate();
		return claimed;
	}

	public SubmittedFormMetadata renewVerificationLease(String id, String owner) {
		Query query = Query.query(Criteria.where("id").is(id).and("verificationLeaseOwner").is(owner));
		Update update = new Update().set("verificationLeaseExpiresAt",
				Instant.now().plus(90, java.time.temporal.ChronoUnit.SECONDS));
		SubmittedFormMetadata renewed = mongoTemplate.findAndModify(query, update,
				FindAndModifyOptions.options().returnNew(true), SubmittedFormMetadata.class);
		if (renewed == null)
			throw new IllegalStateException("La réservation de ce formulaire a expiré.");
		return renewed;
	}

	public void releaseVerificationLease(String id, String owner) {
		Query query = Query.query(Criteria.where("id").is(id).and("verificationLeaseOwner").is(owner));
		var result = mongoTemplate.updateFirst(query,
				new Update().unset("verificationLeaseOwner").unset("verificationLeaseExpiresAt"), SubmittedFormMetadata.class);
		if (result.getModifiedCount() > 0)
			queueUpdatePublisher.publishUpdate();
	}

	public List<PerformanceResult> getPerformanceResultFromSubmittedForm(SubmittedFormMetadata submittedFormMetadata) {
		SubmittedFormSource source = new SubmittedFormSource(submittedFormMetadata.getId());
		var challengeConfiguration = challengeConfigurationService.getChallengeConfigurationByChallenge(submittedFormMetadata.getChallenge());
		List<PerformanceResult> performances = new ArrayList<>();
		var groups = submittedFormMetadata.getFilledForm().getGroups();
		for (var group : groups.entrySet()) {
			for (var field : group.getValue().getFields().values()) {
				if (!field.getPoints().isEmpty() && Stream.of(TEAM_TENS, TEAM_UNITS, CHALLENGE, CHALLENGE_TENS, CHALLENGE_UNITS, PAGE)
						.noneMatch(f -> f.equals(field.getName()))) {
					var questionDefinition = challengeConfiguration.getQuestionDefinitions().getOrDefault(field.getName(), null);
					if (Objects.nonNull(questionDefinition) && questionDefinition.getType().equals(QuestionType.PERFORMANCE)) {
						Double resultValue = field.getPoints().keySet().stream().map(SubmittedFormService::parseDouble)
								.filter(Objects::nonNull).reduce(0d, Double::sum);
						performances.add(new PerformanceResult(field.getName(), resultValue, source));
					}
				}
			}
		}
		return performances;
	}

	public SubmittedForm getSubmittedForm(String id) {
		return submittedFormRepository.findById(id).orElseThrow();
	}

	public SubmittedFormMetadata getSubmittedFormMetadata(String id) {
		return submittedFormMetadataRepository.findById(id).orElseThrow();
	}

	public List<SubmittedFormMetadata> getSubmittedFormMetadatas() {
		return submittedFormMetadataRepository.findAll();
	}

	public Page<SubmittedFormMetadata> getSubmittedFormMetadatas(Pageable pageable) {
		return submittedFormMetadataRepository.findAll(pageable);
	}

	public List<SubmittedFormMetadata> getSubmittedFormMetadatasByChallengeAndPageAndTeam(Integer challenge, Integer page, Integer team) {
		return submittedFormMetadataRepository.findByChallengeAndPageAndTeam(challenge, page, team);
	}

	public List<SubmittedFormMetadata> getSubmittedFormMetadatasByChallengeAndTeam(Integer challenge, Integer team) {
		return submittedFormMetadataRepository.findByChallengeAndTeam(challenge, team);
	}

	public List<ResponseResult> getResponseResultFromSubmittedForm(SubmittedFormMetadata submittedFormMetadata) {
		SubmittedFormSource source = new SubmittedFormSource(submittedFormMetadata.getId());
		var challengeConfiguration = challengeConfigurationService.getChallengeConfigurationByChallenge(submittedFormMetadata.getChallenge());
		List<ResponseResult> results = new ArrayList<>();
		var groups = submittedFormMetadata.getFilledForm().getGroups();
		for (var group : groups.entrySet()) {
			for (var field : group.getValue().getFields().values()) {
				if (Stream.of(TEAM_TENS, TEAM_UNITS, CHALLENGE, CHALLENGE_TENS, CHALLENGE_UNITS, PAGE)
						.noneMatch(f -> f.equals(field.getName()))) {
					var questionDefinition = challengeConfiguration.getQuestionDefinitions().getOrDefault(field.getName(), null);
					if (Objects.nonNull(questionDefinition) && questionDefinition.getType().equals(QuestionType.QUESTION)) {
						results.add(new ResponseResult(field.getName(), getResultValue(field), source));
					}
				}
			}
		}
		return results;
	}

	public List<SubmittedFormMetadata> getSameSubmittedFormMetadatas(SubmittedFormMetadata submittedFormMetadata) {
		return submittedFormMetadataRepository
				.findByChallengeAndPageAndTeam(submittedFormMetadata.getChallenge(), submittedFormMetadata.getPage(),
						submittedFormMetadata.getTeam())
				.stream().filter(item -> !item.getId().equals(submittedFormMetadata.getId())).collect(Collectors.toList());
	}

	public List<SubmittedFormMetadata> getSameSubmittedFormMetadatas(String id) {
		return submittedFormMetadataRepository.findById(id)
				.map(this::getSameSubmittedFormMetadatas)
				.orElseGet(ArrayList::new);
	}

	public SubmittedFormMetadata updateSubmittedFormMetadata(SubmittedFormMetadata submittedFormMetadata)
			throws ParserConfigurationException, SAXException, IOException {
		return updateSubmittedFormMetadata(submittedFormMetadata, true);
	}

	SubmittedFormMetadata updateSubmittedFormMetadataWithoutResultEvent(SubmittedFormMetadata submittedFormMetadata)
			throws ParserConfigurationException, SAXException, IOException {
		return updateSubmittedFormMetadata(submittedFormMetadata, false);
	}

	private SubmittedFormMetadata updateSubmittedFormMetadata(SubmittedFormMetadata submittedFormMetadata, boolean publishResultEvent)
			throws ParserConfigurationException, SAXException, IOException {
		SubmittedFormMetadata updatedSubmittedFormMetadata = submittedFormMetadataRepository.findById(submittedFormMetadata.getId())
				.orElseThrow();
		boolean manualIdentification = Objects.nonNull(submittedFormMetadata.getChallenge())
				|| Objects.nonNull(submittedFormMetadata.getPage()) || Objects.nonNull(submittedFormMetadata.getTeam());
		// NOTE : si l'etapa est renseignée, la page doit aussi l'etre
		if (Objects.nonNull(submittedFormMetadata.getPage()) && Objects.isNull(submittedFormMetadata.getChallenge()))
			// If only the page number is available, the challenge remains unchanged.
			submittedFormMetadata.setChallenge(updatedSubmittedFormMetadata.getChallenge());

		FormTemplate filledForm = null;
		if (isTemplateToUpdate(submittedFormMetadata, updatedSubmittedFormMetadata)) {
			filledForm = updateFormTemplate(submittedFormMetadata, updatedSubmittedFormMetadata);
		}

		if (Objects.nonNull(filledForm))
			updatedSubmittedFormMetadata.setFilledForm(filledForm);
		if (Objects.nonNull(submittedFormMetadata.getChallenge()))
			updatedSubmittedFormMetadata.setChallenge(submittedFormMetadata.getChallenge());
		if (Objects.nonNull(submittedFormMetadata.getPage()))
			updatedSubmittedFormMetadata.setPage(submittedFormMetadata.getPage());
		if (Objects.nonNull(submittedFormMetadata.getTeam()))
			updatedSubmittedFormMetadata.setTeam(submittedFormMetadata.getTeam());
		if (manualIdentification)
			updatedSubmittedFormMetadata.setIdentificationManuallyLocked(true);
		if (Objects.nonNull(submittedFormMetadata.getChecked()))
			updatedSubmittedFormMetadata.setChecked(submittedFormMetadata.getChecked());

		updatedSubmittedFormMetadata = submittedFormMetadataRepository.save(updatedSubmittedFormMetadata);
		if (publishResultEvent)
			messageProducerService.sendMessage(SUBMITTED_FORM_UPDATE_EVENT, updatedSubmittedFormMetadata);
		queueUpdatePublisher.publishUpdate();
		return updatedSubmittedFormMetadata;
	}

	private void deleteSubmittedForm(SubmittedFormMetadata submittedFormMetadata) {
		submittedFormRepository.deleteById(submittedFormMetadata.getId());
		submittedFormMetadataRepository.deleteById(submittedFormMetadata.getId());
		messageProducerService.sendMessage(SUBMITTED_FORM_DELETE_EVENT, submittedFormMetadata);
		queueUpdatePublisher.publishUpdate();
	}

	private Boolean getResultValue(FormQuestion field) {
		Boolean resultValue = false;
		var pointKeys = field.getPoints().keySet();
		if (pointKeys.contains("O")) {
			resultValue = true;
		} else if (pointKeys.contains("N")) {
			resultValue = false;
		} else if (pointKeys.contains("Y")) {
			resultValue = true;
		}
		return resultValue;
	}

	private boolean isTemplateToUpdate(SubmittedFormMetadata submittedFormMetadata, SubmittedFormMetadata updatedSubmittedFormMetadata) {
		return (Objects.nonNull(submittedFormMetadata.getChallenge())
				&& !submittedFormMetadata.getChallenge().equals(updatedSubmittedFormMetadata.getChallenge()))
				|| (Objects.nonNull(submittedFormMetadata.getPage())
						&& !submittedFormMetadata.getPage().equals(updatedSubmittedFormMetadata.getPage()))
				|| (Objects.nonNull(submittedFormMetadata.getFilledForm())
						&& !submittedFormMetadata.getFilledForm().getCorners().isEmpty());
	}

	private void clearDetectedValues(FormTemplate formTemplate) {
		formTemplate.getPoints().clear();
		formTemplate.getAreas().clear();
		formTemplate.getGroups().values().forEach(group -> {
			group.getAreas().clear();
			group.getFields().values().forEach(field -> field.getPoints().clear());
		});
	}

	private FormTemplate updateFormTemplate(SubmittedFormMetadata submittedFormMetadata, SubmittedFormMetadata updatedSubmittedFormMetadata)
			throws IOException, ParserConfigurationException, SAXException {
		SubmittedForm submittedForm = submittedFormRepository.findById(submittedFormMetadata.getId()).orElseThrow();
		String name = submittedForm.getMetadata().getFilledForm().getName();
		Integer challenge = Objects.nonNull(submittedFormMetadata.getChallenge()) ? submittedFormMetadata.getChallenge()
				: updatedSubmittedFormMetadata.getChallenge();
		Integer page = Objects.nonNull(submittedFormMetadata.getPage()) ? submittedFormMetadata.getPage()
				: updatedSubmittedFormMetadata.getPage();
		HashMap<Corners, FormPoint> corners = Objects.nonNull(submittedFormMetadata.getFilledForm())
				? submittedFormMetadata.getFilledForm().getCorners()
				: updatedSubmittedFormMetadata.getFilledForm().getCorners();

		return recalculateFromManualCorners(submittedForm, submittedFormMetadata, updatedSubmittedFormMetadata,
				name, challenge, page, corners);
	}

	private FormTemplate recalculateFromManualCorners(SubmittedForm submittedForm,
			SubmittedFormMetadata requestedInfo, SubmittedFormMetadata storedInfo, String name, Integer challenge, Integer page,
			HashMap<Corners, FormPoint> corners)
			throws ParserConfigurationException, SAXException, IOException {
		var reference = formRecognitionConfigurationService.getReferenceFormReferenceImage().orElse(null);
		if (Objects.isNull(reference) || Objects.isNull(reference.getFile()))
			throw new IllegalStateException("Aucun formulaire de référence n'est configuré.");

		byte[] recalculationSource = submittedForm.getFile().getData();
		String recalculationSourceType = submittedForm.getFileType();
		var processed = formProcessingClient.identifyWithMarkers(
				recalculationSource, name + ".png",
				recalculationSourceType, reference.getFile().getData(), reference.getFileType(),
				Objects.nonNull(reference.getConfiguration()) ? reference.getConfiguration().getTemplate() : null,
				makeMarkerSet(corners));
		var result = processed;
		if (!storedInfo.isIdentificationManuallyLocked() && Objects.nonNull(result.getIdentification())
				&& result.getIdentification().getConfidence() >= 0.60) {
			var identification = result.getIdentification();
			if (Objects.nonNull(identification.getChallenge()) && Objects.nonNull(identification.getPage())
					&& formRecognitionConfigurationService
							.getFormRecognitionConfigurationByChallengeAndPage(identification.getChallenge(), identification.getPage())
							.isPresent()) {
				challenge = identification.getChallenge();
				page = identification.getPage();
				requestedInfo.setChallenge(challenge);
				requestedInfo.setPage(page);
				if (Objects.nonNull(identification.getTeam()))
					requestedInfo.setTeam(identification.getTeam());
			}
		}

		FormProcessingClient.ProcessedImage geometryResult = result;
		var exactConfiguration = formRecognitionConfigurationService.getFormRecognitionConfigurationByChallengeAndPage(challenge, page).orElse(null);
		if (Objects.nonNull(exactConfiguration)) {
			var exactReferenceImage = formRecognitionConfigurationService.getFormReferenceImage(exactConfiguration.getId());
			if (Objects.nonNull(exactReferenceImage) && Objects.nonNull(exactReferenceImage.getFile())) {
				geometryResult = formProcessingClient.processWithMarkers(
						recalculationSource, name + ".png", recalculationSourceType,
						exactReferenceImage.getFile().getData(), exactReferenceImage.getFileType(), exactConfiguration.getTemplate(),
						makeMarkerSet(corners));
			}
		}
		java.util.List<FormProcessingClient.Correction> corrections = geometryResult.getCorrections();

		BufferedImage sourceImage = ImageIO.read(new ByteArrayInputStream(recalculationSource));
		if (Objects.isNull(sourceImage))
			throw new IllegalStateException("L'image du formulaire n'est pas exploitable.");
		FormTemplate filledForm = makeEmptyProcessedFormTemplate(sourceImage, name, challenge, page, corners);
		storedInfo.setFilledForm(filledForm);
		applyProcessingCorrections(storedInfo, corrections, geometryResult.getSourceToNormalizedTransform());
		Integer effectiveTeam = Objects.nonNull(requestedInfo.getTeam()) ? requestedInfo.getTeam() : storedInfo.getTeam();
		applyIdentificationMarks(filledForm, effectiveTeam, challenge, page,
				geometryResult.getSourceToNormalizedTransform());
		return filledForm;
	}

	private void applyIdentificationMarks(FormTemplate form, Integer team, Integer challenge, Integer page,
			double[][] sourceToNormalizedTransform) {
		if (Objects.nonNull(team)) {
			String value = String.format(java.util.Locale.ROOT, "%02d", team);
			setIdentificationField(form, TEAM_TENS, value.substring(0, 1), sourceToNormalizedTransform);
			setIdentificationField(form, TEAM_UNITS, value.substring(value.length() - 1), sourceToNormalizedTransform);
		}
		if (Objects.nonNull(challenge)) {
			String value = String.format(java.util.Locale.ROOT, "%02d", challenge);
			setIdentificationField(form, CHALLENGE, Integer.toString(challenge), sourceToNormalizedTransform);
			setIdentificationField(form, CHALLENGE_TENS, value.substring(0, 1), sourceToNormalizedTransform);
			setIdentificationField(form, CHALLENGE_UNITS, value.substring(value.length() - 1), sourceToNormalizedTransform);
		}
		if (Objects.nonNull(page))
			setIdentificationField(form, PAGE, Integer.toString(page), sourceToNormalizedTransform);
	}

	private void setIdentificationField(FormTemplate form, String fieldName, String value,
			double[][] sourceToNormalizedTransform) {
		FormQuestion field = findQuestion(form, fieldName);
		FormQuestion templateField = Objects.nonNull(form.getParentTemplate())
				? findQuestion(form.getParentTemplate(), fieldName)
				: null;
		if (Objects.isNull(field) || Objects.isNull(templateField))
			return;
		FormPoint templatePoint = templateField.getPoints().get(value);
		if (Objects.isNull(templatePoint))
			return;
		field.getPoints().clear();
		field.getPoints().put(value, mapToSource(templatePoint, sourceToNormalizedTransform));
	}

	private FormProcessingClient.MarkerSet makeMarkerSet(HashMap<Corners, FormPoint> corners) {
		FormProcessingClient.MarkerSet markers = new FormProcessingClient.MarkerSet();
		markers.setTopLeft(makeMarkerPoint(corners.get(Corners.TOP_LEFT)));
		markers.setTopRight(makeMarkerPoint(corners.get(Corners.TOP_RIGHT)));
		markers.setBottomRight(makeMarkerPoint(corners.get(Corners.BOTTOM_RIGHT)));
		markers.setBottomLeft(makeMarkerPoint(corners.get(Corners.BOTTOM_LEFT)));
		return markers;
	}

	private FormProcessingClient.MarkerPoint makeMarkerPoint(FormPoint point) {
		FormProcessingClient.MarkerPoint marker = new FormProcessingClient.MarkerPoint();
		marker.setX(point.getX());
		marker.setY(point.getY());
		return marker;
	}

	private FormTemplate makeEmptyProcessedFormTemplate(BufferedImage image, String name, Integer challenge, Integer page,
			HashMap<Corners, FormPoint> corners)
			throws ParserConfigurationException, SAXException, IOException {
		FormTemplate template = formRecognitionConfigurationService.parseFormTemplate(challenge, page);
		FormTemplate parent = copyFormTemplate(template);
		FormTemplate result = copyFormTemplate(template);
		result.setParentTemplate(parent);
		result.setName(name);
		result.setCorners(new HashMap<>());
		corners.forEach((position, value) ->
				result.getCorners().put(position, new FormPoint(value.getX(), value.getY())));
		clearDetectedValues(result);
		result.setHeight(image.getHeight());
		result.setWidth(image.getWidth());
		formRecognitionConfigurationService.getFormRecognitionConfigurationByChallengeAndPage(challenge, page).ifPresent(configuration -> {
			result.getParentTemplate().setHeight(configuration.getHeight());
			result.getParentTemplate().setWidth(configuration.getWidth());
		});
		return result;
	}

	private FormTemplate copyFormTemplate(FormTemplate source) {
		FormTemplate copy = new FormTemplate();
		BeanUtils.copyProperties(source, copy, "groups", "corners", "points", "areas", "parentTemplate", "crop",
				"usedGroupNames");
		copy.setCrop(new HashMap<>(source.getCrop()));
		copy.setUsedGroupNames(new ArrayList<>(source.getUsedGroupNames()));
		source.getCorners().forEach((key, value) -> copy.getCorners().put(key, new FormPoint(value.getX(), value.getY())));
		for (var groupEntry : source.getGroups().entrySet()) {
			FormGroup groupCopy = new FormGroup();
			groupCopy.setLastFieldIndex(groupEntry.getValue().getLastFieldIndex());
			for (var fieldEntry : groupEntry.getValue().getFields().entrySet()) {
				FormQuestion fieldCopy = new FormQuestion();
				BeanUtils.copyProperties(fieldEntry.getValue(), fieldCopy, "points");
				fieldEntry.getValue().getPoints().forEach((key, value) ->
						fieldCopy.getPoints().put(key, new FormPoint(value.getX(), value.getY())));
				groupCopy.getFields().put(fieldEntry.getKey(), fieldCopy);
			}
			copy.getGroups().put(groupEntry.getKey(), groupCopy);
		}
		return copy;
	}
}
