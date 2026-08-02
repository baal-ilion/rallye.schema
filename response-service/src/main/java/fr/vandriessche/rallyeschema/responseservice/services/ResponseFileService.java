package fr.vandriessche.rallyeschema.responseservice.services;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
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
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import fr.vandriessche.rallyeschema.responseservice.entities.Corners;
import fr.vandriessche.rallyeschema.responseservice.entities.FormGroup;
import fr.vandriessche.rallyeschema.responseservice.entities.FormPoint;
import fr.vandriessche.rallyeschema.responseservice.entities.FormQuestion;
import fr.vandriessche.rallyeschema.responseservice.entities.FormTemplate;
import fr.vandriessche.rallyeschema.responseservice.entities.PerformanceResult;
import fr.vandriessche.rallyeschema.responseservice.entities.QuestionType;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFile;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileSource;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileInfoRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileRepository;
import lombok.extern.java.Log;

@Service
@Log
public class ResponseFileService {
	public static final String RESPONSE_FILE_CREATE_EVENT = "responseFile.create";
	public static final String RESPONSE_FILE_UPDATE_EVENT = "responseFile.update";
	public static final String RESPONSE_FILE_DELETE_EVENT = "responseFile.delete";

	private static final String PAGE = "Page";
	private static final String ETAPE = "Etape";
	private static final String ETAPE1 = "Etape1";
	private static final String ETAPE2 = "Etape2";
	private static final String EQUIPE2 = "Equipe2";
	private static final String EQUIPE1 = "Equipe1";

	private static Double parseDouble(String v) {
		try {
			return Double.parseDouble(v);
		} catch (NumberFormatException | NullPointerException e) {
			log.log(Level.WARNING, "parseDouble", e);
		}
		return null;
	}

	@Autowired
	private ResponseFileRepository responseFileRepository;

	@Autowired
	private ResponseFileInfoRepository responseFileInfoRepository;
	@Autowired
	private ResponseFileParamService responseFileParamService;
	@Autowired
	private FormProcessingClient formProcessingClient;
	@Autowired
	private StageParamService stageParamService;

	@Autowired
	private MessageProducerService messageProducerService;

	public ResponseFile addResponseFile(MultipartFile file)
			throws IOException, ParserConfigurationException, SAXException {
		String contentType = file.getContentType();
		if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
			throw new IllegalArgumentException("Only image files are supported");
		}

		byte[] originalContent = file.getBytes();
		var reference = responseFileParamService.getReferenceResponseFileModel().orElse(null);
		var processed = formProcessingClient.process(
				originalContent,
				file.getOriginalFilename(),
				contentType,
				Objects.nonNull(reference) ? reference.getFile().getData() : null,
				Objects.nonNull(reference) ? reference.getFileType() : null,
				Objects.nonNull(reference) && Objects.nonNull(reference.getParam())
						? reference.getParam().getTemplate() : null);
		return addResponseFileFromProcessing(file, originalContent, processed);
	}

	private ResponseFile addResponseFileFromProcessing(MultipartFile file, byte[] originalContent,
			FormProcessingClient.ProcessedImage genericResult)
			throws IOException, ParserConfigurationException, SAXException {
		String name = FilenameUtils.getBaseName(file.getOriginalFilename());
		ResponseFileInfo info = new ResponseFileInfo();
		var identification = genericResult.getIdentification();
		if (Objects.nonNull(identification)) {
			info.setTeam(identification.getTeam());
			info.setStage(identification.getStage());
			info.setPage(identification.getPage());
		}

		FormProcessingClient.ProcessedImage pageResult = genericResult;
		boolean exactTemplateUsed = false;
		if (Objects.nonNull(info.getStage()) && Objects.nonNull(info.getPage())) {
			var exactParam = responseFileParamService
					.getResponseFileParamByStageAndPage(info.getStage(), info.getPage()).orElse(null);
			if (Objects.nonNull(exactParam) && Objects.nonNull(exactParam.getTemplate())) {
				var exactModel = responseFileParamService.getResponseFileModel(exactParam.getId());
				if (Objects.nonNull(exactModel) && Objects.nonNull(exactModel.getFile())) {
					pageResult = formProcessingClient.process(
							originalContent, file.getOriginalFilename(), file.getContentType(),
							exactModel.getFile().getData(), exactModel.getFileType(), exactParam.getTemplate());
					exactTemplateUsed = true;
				}
			}
		}

		BufferedImage image = ImageIO.read(new ByteArrayInputStream(pageResult.getContent()));
		if (Objects.isNull(image))
			throw new IllegalStateException("Le service de traitement n'a retourné aucune image exploitable.");
		HashMap<Corners, FormPoint> corners = makeTrustedCorners(pageResult);
		FormTemplate filledForm = makeEmptyProcessedFormTemplate(image, name,
				exactTemplateUsed ? info.getStage() : null,
				exactTemplateUsed ? info.getPage() : null, corners);
		info.setFilledForm(filledForm);
		if (exactTemplateUsed)
			applyProcessingCorrections(info, pageResult.getCorrections());
		applyIdentificationMarks(filledForm, info.getTeam(), info.getStage(), info.getPage(), null);
		copyProcessingMetadata(info, pageResult);
		boolean incompleteIdentification = Objects.isNull(identification)
				|| Objects.isNull(info.getTeam()) || Objects.isNull(info.getStage()) || Objects.isNull(info.getPage())
				|| identification.getConfidence() < 0.60 || !exactTemplateUsed;
		if (incompleteIdentification) {
			info.setManualReviewRequired(true);
			if ("READY".equals(info.getProcessingStatus()))
				info.setProcessingStatus("READY_WITH_WARNINGS");
		}

		info = responseFileInfoRepository.save(info);
		ResponseFile responseFile = new ResponseFile();
		responseFile.setId(info.getId());
		responseFile.setInfo(info);
		responseFile.setFile(new Binary(BsonBinarySubType.BINARY, pageResult.getContent()));
		responseFile.setFileExtension("png");
		responseFile.setFileType(pageResult.getContentType());
		responseFile.setOriginalFile(new Binary(BsonBinarySubType.BINARY, originalContent));
		responseFile.setOriginalFileExtension(FilenameUtils.getExtension(file.getOriginalFilename()));
		responseFile.setOriginalFileType(file.getContentType());
		responseFile = responseFileRepository.insert(responseFile);
		messageProducerService.sendMessage(RESPONSE_FILE_CREATE_EVENT, info);
		return responseFile;
	}

	private void copyProcessingMetadata(ResponseFileInfo info, FormProcessingClient.ProcessedImage result) {
		info.setProcessingStatus(result.getStatus());
		info.setAutomaticMarkerDetection(result.isAutomaticMarkerDetection());
		info.setManualReviewRequired(result.isManualReviewRequired());
		info.setDetectedRotationDegrees(result.getDetectedRotationDegrees());
		info.setReferenceAlignmentError(result.getReferenceAlignmentError());
		info.setLocalAlignmentApplied(result.isLocalAlignmentApplied());
		info.setLocalAlignmentConfidence(result.getLocalAlignmentConfidence());
		info.setLocalAlignmentAnchorCount(result.getLocalAlignmentAnchorCount());
		info.setLocalAlignmentMeanDisplacement(result.getLocalAlignmentMeanDisplacement());
		info.setLocalAlignmentMaximumDisplacement(result.getLocalAlignmentMaximumDisplacement());
	}

	void applyProcessingCorrections(ResponseFileInfo info,
			java.util.List<FormProcessingClient.Correction> corrections) {
		applyProcessingCorrections(info, corrections, null);
	}

	private void applyProcessingCorrections(ResponseFileInfo info,
			java.util.List<FormProcessingClient.Correction> corrections, double[][] sourceToNormalizedTransform) {
		corrections.forEach(correction ->
				applyCorrectionMarks(info.getFilledForm(), correction, sourceToNormalizedTransform));
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
		responseFileInfoRepository.findByTeam(team).forEach(responseFileInfo -> deleteResponseFile(responseFileInfo));
	}

	public void deleteByStage(Integer stage) {
		responseFileInfoRepository.findByStage(stage).forEach(this::deleteResponseFile);
	}

	public void deleteByStageAndTeam(Integer stage, Integer team) {
		responseFileInfoRepository.findByStageAndTeam(stage, team)
				.forEach(responseFileInfo -> deleteResponseFile(responseFileInfo));
	}

	public void deleteResponseFile(String id) {
		ResponseFileInfo responseFileInfo = responseFileInfoRepository.findById(id).orElseThrow();
		deleteResponseFile(responseFileInfo);
	}

	public Page<ResponseFileInfo> getNotCheckedResponseFileInfos(Pageable pageable) {
		return responseFileInfoRepository.findByCheckedFalseOrCheckedNull(pageable);
	}

	public List<PerformanceResult> getPerformanceResultFromResponseFile(ResponseFileInfo responseFileInfo) {
		ResponseFileSource source = new ResponseFileSource(responseFileInfo.getId());
		var param = stageParamService.getStageParamByStage(responseFileInfo.getStage());
		List<PerformanceResult> performances = new ArrayList<>();
		var groups = responseFileInfo.getFilledForm().getGroups();
		for (var group : groups.entrySet()) {
			for (var field : group.getValue().getFields().values()) {
				if (!field.getPoints().isEmpty() && Stream.of(EQUIPE1, EQUIPE2, ETAPE, ETAPE1, ETAPE2, PAGE)
						.noneMatch(f -> f.equals(field.getName()))) {
					var questionParam = param.getQuestionParams().getOrDefault(field.getName(), null);
					if (Objects.nonNull(questionParam) && questionParam.getType().equals(QuestionType.PERFORMANCE)) {
						Double resultValue = field.getPoints().keySet().stream().map(ResponseFileService::parseDouble)
								.filter(Objects::nonNull).reduce(0d, Double::sum);
						performances.add(new PerformanceResult(field.getName(), resultValue, source));
					}
				}
			}
		}
		return performances;
	}

	public ResponseFile getResponseFile(String id) {
		return responseFileRepository.findById(id).orElseThrow();
	}

	public ResponseFileInfo getResponseFileInfo(String id) {
		return responseFileInfoRepository.findById(id).orElseThrow();
	}

	public List<ResponseFileInfo> getResponseFileInfos() {
		return responseFileInfoRepository.findAll();
	}

	public Page<ResponseFileInfo> getResponseFileInfos(Pageable pageable) {
		return responseFileInfoRepository.findAll(pageable);
	}

	public List<ResponseFileInfo> getResponseFileInfosByStageAndPageAndTeam(Integer stage, Integer page, Integer team) {
		return responseFileInfoRepository.findByStageAndPageAndTeam(stage, page, team);
	}

	public List<ResponseFileInfo> getResponseFileInfosByStageAndTeam(Integer stage, Integer team) {
		return responseFileInfoRepository.findByStageAndTeam(stage, team);
	}

	public List<ResponseResult> getResponseResultFromResponseFile(ResponseFileInfo responseFileInfo) {
		ResponseFileSource source = new ResponseFileSource(responseFileInfo.getId());
		var param = stageParamService.getStageParamByStage(responseFileInfo.getStage());
		List<ResponseResult> results = new ArrayList<>();
		var groups = responseFileInfo.getFilledForm().getGroups();
		for (var group : groups.entrySet()) {
			for (var field : group.getValue().getFields().values()) {
				if (Stream.of(EQUIPE1, EQUIPE2, ETAPE, ETAPE1, ETAPE2, PAGE)
						.noneMatch(f -> f.equals(field.getName()))) {
					var questionParam = param.getQuestionParams().getOrDefault(field.getName(), null);
					if (Objects.nonNull(questionParam) && questionParam.getType().equals(QuestionType.QUESTION)) {
						results.add(new ResponseResult(field.getName(), getResultValue(field), source));
					}
				}
			}
		}
		return results;
	}

	public List<ResponseFileInfo> getSameResponseFileInfos(ResponseFileInfo responseFileInfo) {
		return responseFileInfoRepository
				.findByStageAndPageAndTeam(responseFileInfo.getStage(), responseFileInfo.getPage(),
						responseFileInfo.getTeam())
				.stream().filter(item -> !item.getId().equals(responseFileInfo.getId())).collect(Collectors.toList());
	}

	public List<ResponseFileInfo> getSameResponseFileInfos(String id) {
		ResponseFileInfo responseFileInfo = responseFileInfoRepository.findById(id).orElseThrow();
		return getSameResponseFileInfos(responseFileInfo);
	}

	public ResponseFileInfo updateResponseFileInfo(ResponseFileInfo responseFileInfo)
			throws ParserConfigurationException, SAXException, IOException {
		ResponseFileInfo updatedResponseFileInfo = responseFileInfoRepository.findById(responseFileInfo.getId())
				.orElseThrow();
		boolean manualIdentification = Objects.nonNull(responseFileInfo.getStage())
				|| Objects.nonNull(responseFileInfo.getPage()) || Objects.nonNull(responseFileInfo.getTeam());
		// NOTE : si l'etapa est renseignée, la page doit aussi l'etre
		if (Objects.nonNull(responseFileInfo.getPage()) && Objects.isNull(responseFileInfo.getStage()))
			// si on n'a que le n° de page on considere que l'etape ne change pas
			responseFileInfo.setStage(updatedResponseFileInfo.getStage());

		FormTemplate filledForm = null;
		if (isTemplateToUpdate(responseFileInfo, updatedResponseFileInfo)) {
			filledForm = updateFormTemplate(responseFileInfo, updatedResponseFileInfo);
		}

		if (Objects.nonNull(filledForm))
			updatedResponseFileInfo.setFilledForm(filledForm);
		if (Objects.nonNull(responseFileInfo.getStage()))
			updatedResponseFileInfo.setStage(responseFileInfo.getStage());
		if (Objects.nonNull(responseFileInfo.getPage()))
			updatedResponseFileInfo.setPage(responseFileInfo.getPage());
		if (Objects.nonNull(responseFileInfo.getTeam()))
			updatedResponseFileInfo.setTeam(responseFileInfo.getTeam());
		if (manualIdentification)
			updatedResponseFileInfo.setIdentificationManuallyLocked(true);
		if (Objects.nonNull(responseFileInfo.getChecked()))
			updatedResponseFileInfo.setChecked(responseFileInfo.getChecked());

		updatedResponseFileInfo = responseFileInfoRepository.save(updatedResponseFileInfo);
		messageProducerService.sendMessage(RESPONSE_FILE_UPDATE_EVENT, updatedResponseFileInfo);
		return updatedResponseFileInfo;
	}

	private void deleteResponseFile(ResponseFileInfo responseFileInfo) {
		responseFileRepository.deleteById(responseFileInfo.getId());
		responseFileInfoRepository.deleteById(responseFileInfo.getId());
		messageProducerService.sendMessage(RESPONSE_FILE_DELETE_EVENT, responseFileInfo);
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

	private boolean isTemplateToUpdate(ResponseFileInfo responseFileInfo, ResponseFileInfo updatedResponseFileInfo) {
		return (Objects.nonNull(responseFileInfo.getStage())
				&& !responseFileInfo.getStage().equals(updatedResponseFileInfo.getStage()))
				|| (Objects.nonNull(responseFileInfo.getPage())
						&& !responseFileInfo.getPage().equals(updatedResponseFileInfo.getPage()))
				|| (Objects.nonNull(responseFileInfo.getFilledForm())
						&& !responseFileInfo.getFilledForm().getCorners().isEmpty());
	}

	private void clearDetectedValues(FormTemplate formTemplate) {
		formTemplate.getPoints().clear();
		formTemplate.getAreas().clear();
		formTemplate.getGroups().values().forEach(group -> {
			group.getAreas().clear();
			group.getFields().values().forEach(field -> field.getPoints().clear());
		});
	}

	private FormTemplate updateFormTemplate(ResponseFileInfo responseFileInfo, ResponseFileInfo updatedResponseFileInfo)
			throws IOException, ParserConfigurationException, SAXException {
		ResponseFile responseFile = responseFileRepository.findById(responseFileInfo.getId()).orElseThrow();
		String name = responseFile.getInfo().getFilledForm().getName();
		Integer stage = Objects.nonNull(responseFileInfo.getStage()) ? responseFileInfo.getStage()
				: updatedResponseFileInfo.getStage();
		Integer page = Objects.nonNull(responseFileInfo.getPage()) ? responseFileInfo.getPage()
				: updatedResponseFileInfo.getPage();
		HashMap<Corners, FormPoint> corners = Objects.nonNull(responseFileInfo.getFilledForm())
				? responseFileInfo.getFilledForm().getCorners()
				: updatedResponseFileInfo.getFilledForm().getCorners();

		return recalculateFromManualCorners(responseFile, responseFileInfo, updatedResponseFileInfo,
				name, stage, page, corners);
	}

	private FormTemplate recalculateFromManualCorners(ResponseFile responseFile,
			ResponseFileInfo requestedInfo, ResponseFileInfo storedInfo, String name, Integer stage, Integer page,
			HashMap<Corners, FormPoint> corners)
			throws ParserConfigurationException, SAXException, IOException {
		var reference = responseFileParamService.getReferenceResponseFileModel().orElse(null);
		if (Objects.isNull(reference) || Objects.isNull(reference.getFile()))
			throw new IllegalStateException("Aucun formulaire de référence n'est configuré.");

		byte[] recalculationSource = responseFile.getFile().getData();
		String recalculationSourceType = responseFile.getFileType();
		var processed = formProcessingClient.identifyWithMarkers(
				recalculationSource, name + ".png",
				recalculationSourceType, reference.getFile().getData(), reference.getFileType(),
				Objects.nonNull(reference.getParam()) ? reference.getParam().getTemplate() : null,
				makeMarkerSet(corners));
		var result = processed;
		if (!storedInfo.isIdentificationManuallyLocked() && Objects.nonNull(result.getIdentification())
				&& result.getIdentification().getConfidence() >= 0.60) {
			var identification = result.getIdentification();
			if (Objects.nonNull(identification.getStage()) && Objects.nonNull(identification.getPage())
					&& responseFileParamService
							.getResponseFileParamByStageAndPage(identification.getStage(), identification.getPage())
							.isPresent()) {
				stage = identification.getStage();
				page = identification.getPage();
				requestedInfo.setStage(stage);
				requestedInfo.setPage(page);
				if (Objects.nonNull(identification.getTeam()))
					requestedInfo.setTeam(identification.getTeam());
			}
		}

		FormProcessingClient.ProcessedImage geometryResult = result;
		var exactParam = responseFileParamService.getResponseFileParamByStageAndPage(stage, page).orElse(null);
		if (Objects.nonNull(exactParam)) {
			var exactModel = responseFileParamService.getResponseFileModel(exactParam.getId());
			if (Objects.nonNull(exactModel) && Objects.nonNull(exactModel.getFile())) {
				geometryResult = formProcessingClient.processWithMarkers(
						recalculationSource, name + ".png", recalculationSourceType,
						exactModel.getFile().getData(), exactModel.getFileType(), exactParam.getTemplate(),
						makeMarkerSet(corners));
			}
		}
		java.util.List<FormProcessingClient.Correction> corrections = geometryResult.getCorrections();

		BufferedImage sourceImage = ImageIO.read(new ByteArrayInputStream(recalculationSource));
		if (Objects.isNull(sourceImage))
			throw new IllegalStateException("L'image du formulaire n'est pas exploitable.");
		FormTemplate filledForm = makeEmptyProcessedFormTemplate(sourceImage, name, stage, page, corners);
		storedInfo.setFilledForm(filledForm);
		applyProcessingCorrections(storedInfo, corrections, geometryResult.getSourceToNormalizedTransform());
		Integer effectiveTeam = Objects.nonNull(requestedInfo.getTeam()) ? requestedInfo.getTeam() : storedInfo.getTeam();
		applyIdentificationMarks(filledForm, effectiveTeam, stage, page,
				geometryResult.getSourceToNormalizedTransform());
		return filledForm;
	}

	private void applyIdentificationMarks(FormTemplate form, Integer team, Integer stage, Integer page,
			double[][] sourceToNormalizedTransform) {
		if (Objects.nonNull(team)) {
			String value = String.format(java.util.Locale.ROOT, "%02d", team);
			setIdentificationField(form, EQUIPE1, value.substring(0, 1), sourceToNormalizedTransform);
			setIdentificationField(form, EQUIPE2, value.substring(value.length() - 1), sourceToNormalizedTransform);
		}
		if (Objects.nonNull(stage)) {
			String value = String.format(java.util.Locale.ROOT, "%02d", stage);
			setIdentificationField(form, ETAPE, Integer.toString(stage), sourceToNormalizedTransform);
			setIdentificationField(form, ETAPE1, value.substring(0, 1), sourceToNormalizedTransform);
			setIdentificationField(form, ETAPE2, value.substring(value.length() - 1), sourceToNormalizedTransform);
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

	private FormTemplate makeEmptyProcessedFormTemplate(BufferedImage image, String name, Integer stage, Integer page,
			HashMap<Corners, FormPoint> corners)
			throws ParserConfigurationException, SAXException, IOException {
		FormTemplate template = responseFileParamService.parseFormTemplate(stage, page);
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
		responseFileParamService.getResponseFileParamByStageAndPage(stage, page).ifPresent(param -> {
			result.getParentTemplate().setHeight(param.getHeight());
			result.getParentTemplate().setWidth(param.getWidth());
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
