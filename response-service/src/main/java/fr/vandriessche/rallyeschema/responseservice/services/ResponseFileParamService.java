package fr.vandriessche.rallyeschema.responseservice.services;

import java.awt.image.BufferedImage;
import java.io.BufferedWriter;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import javax.imageio.ImageIO;
import javax.xml.parsers.ParserConfigurationException;

import org.apache.commons.io.FilenameUtils;
import org.bson.BsonBinarySubType;
import org.bson.types.Binary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import com.albertoborsetta.formscanner.api.FormQuestion;
import com.albertoborsetta.formscanner.api.commons.Constants.FieldType;

import fr.vandriessche.rallyeschema.responseservice.entities.QuestionPageParam;
import fr.vandriessche.rallyeschema.responseservice.entities.QuestionType;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileModel;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileModelRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileParamRepository;
import fr.vandriessche.rallyeschema.responseservice.models.GeneratedResponseFileParamRequest;
import lombok.extern.java.Log;

@Service
@Log
public class ResponseFileParamService {
	private static final String PAGE = "Page";

	private static final String STAGE = "Etape";

	private static final String TEAM = "Equipe";

	@Autowired
	private ResponseFileParamRepository responseFileParamRepository;
	@Autowired
	private ResponseFileModelRepository responseFileModelRepository;
	@Autowired
	private StageParamService stageParamService;

	public ResponseFileParam addResponseFileParam(ResponseFileParam responseFileParam, MultipartFile fileModel,
			ResponseFileModel model) throws ParserConfigurationException, SAXException, IOException {
		if (Objects.isNull(responseFileParam))
			responseFileParam = new ResponseFileParam();
		if (Objects.nonNull(responseFileParam.getId()))
			responseFileParamRepository.findById(responseFileParam.getId()).orElseThrow();

		validateUniqueStageAndPage(responseFileParam);
		fillResponseFileParam(responseFileParam);
		ResponseFileModel responseFileModel = Objects.nonNull(fileModel) ? makeResponseFileModel(fileModel, null)
				: model;
		if (Objects.isNull(responseFileModel))
			responseFileModel = responseFileModelRepository.findById(responseFileParam.getId()).orElseThrow();
		fillResponseFileParam(responseFileParam, responseFileModel);
		responseFileParam = responseFileParamRepository.save(responseFileParam);
		fillResponseFileModel(responseFileParam, responseFileModel);
		responseFileModelRepository.save(responseFileModel);
		stageParamService.updateResponseFileParams(responseFileParam);
		return responseFileParam;
	}

	public ResponseFileParam addReferenceResponseFileParam(ResponseFileParam responseFileParam,
			ResponseFileModel responseFileModel) throws ParserConfigurationException, SAXException, IOException {
		responseFileParam.setId(null);
		responseFileParam.setStage(null);
		responseFileParam.setPage(null);
		fillResponseFileParam(responseFileParam);
		fillResponseFileParam(responseFileParam, responseFileModel);
		responseFileParam = responseFileParamRepository.save(responseFileParam);
		fillResponseFileModel(responseFileParam, responseFileModel);
		responseFileModelRepository.save(responseFileModel);
		return responseFileParam;
	}

	public void deleteCascadeResponseFileParam(String id) {
		var responseFileParam = responseFileParamRepository.findById(id).orElseThrow();
		stageParamService.removeResponseFileParam(responseFileParam);
		deleteResponseFileParam(id);
	}

	public void deleteResponseFileParam(String id) {
		responseFileModelRepository.deleteById(id);
		responseFileParamRepository.deleteById(id);
	}

	public ResponseFileModel getResponseFileModel(String id) {
		return responseFileModelRepository.findById(id).orElseThrow();
	}

	public ResponseFileParam getResponseFileParam(String id) {
		return responseFileParamRepository.findById(id).orElseThrow();
	}

	public Optional<ResponseFileParam> getResponseFileParamByStageAndPage(Integer stage, Integer page) {
		return responseFileParamRepository.findByStageAndPage(stage, page);
	}

	public List<ResponseFileParam> getResponseFileParams() {
		return responseFileParamRepository.findAll();
	}

	public Page<ResponseFileParam> getResponseFileParams(Pageable pageable) {
		return responseFileParamRepository.findAll(pageable);
	}

	public List<ResponseFileParam> getResponseFileParamsByStage(Integer stage) {
		return responseFileParamRepository.findByStage(stage);
	}

	public Optional<ResponseFileParam> getReferenceResponseFileParam() {
		return responseFileParamRepository.findByStageIsNullAndPageIsNull();
	}

	public void deleteResponseFileParamsByStage(Integer stage) {
		new ArrayList<>(responseFileParamRepository.findByStage(stage))
				.forEach(param -> deleteCascadeResponseFileParam(param.getId()));
	}

	public List<ResponseFileParam> replaceGeneratedStageResponseFileParams(Integer stage,
			List<GeneratedResponseFileParamRequest> generatedPages)
			throws ParserConfigurationException, SAXException, IOException {
		List<ResponseFileParam> existingPages = responseFileParamRepository.findByStage(stage);
		List<ResponseFileParam> savedPages = new ArrayList<>();
		for (GeneratedResponseFileParamRequest generatedPage : generatedPages) {
			ResponseFileParam param = Objects.requireNonNull(generatedPage.getParam(), "Paramètres de page absents.");
			param.setStage(stage);
			ResponseFileParam existing = responseFileParamRepository.findByStageAndPage(stage, param.getPage())
					.orElse(null);
			param.setId(existing == null ? null : existing.getId());
			savedPages.add(addResponseFileParam(param, null, makeGeneratedResponseFileModel(generatedPage)));
		}
		List<Integer> publishedPageNumbers = savedPages.stream().map(ResponseFileParam::getPage)
				.collect(java.util.stream.Collectors.toList());
		existingPages.stream().filter(existing -> !publishedPageNumbers.contains(existing.getPage()))
				.forEach(existing -> deleteCascadeResponseFileParam(existing.getId()));
		return savedPages;
	}

	public ResponseFileParam saveGeneratedReferenceResponseFileParam(GeneratedResponseFileParamRequest generated)
			throws ParserConfigurationException, SAXException, IOException {
		ResponseFileParam param = Objects.requireNonNull(generated.getParam(), "Paramètres de référence absents.");
		param.setStage(null);
		param.setPage(null);
		ResponseFileParam existingReference = getReferenceResponseFileParam().orElse(null);
		if (existingReference != null)
			param.setId(existingReference.getId());
		fillResponseFileParam(param);
		ResponseFileModel model = makeGeneratedResponseFileModel(generated);
		fillResponseFileParam(param, model);
		param = responseFileParamRepository.save(param);
		fillResponseFileModel(param, model);
		responseFileModelRepository.save(model);
		return param;
	}

	public void deleteReferenceResponseFileParam() {
		getReferenceResponseFileParam().ifPresent(reference -> deleteResponseFileParam(reference.getId()));
	}

	public com.albertoborsetta.formscanner.api.FormTemplate makeFormTemplate(Integer stage, Integer page)
			throws ParserConfigurationException, SAXException, IOException {
		var param = getResponseFileParamByStageAndPage(stage, page);
		if (param.isEmpty()) {
			ResponseFileParam reference = getReferenceResponseFileParam()
					.orElseThrow(() -> new IllegalStateException("Aucun formulaire de référence n'est configuré."));
			return makeFormTemplate(reference);
		}
		return makeFormTemplate(param.get());
	}

	public ResponseFileParam updateResponseFileParam(ResponseFileParam responseFileParam, MultipartFile fileModel)
			throws ParserConfigurationException, SAXException, IOException {
		responseFileParamRepository.findById(responseFileParam.getId()).orElseThrow();
		// else if (getResponseFileParamByStageAndPage(responseFileParam.getStage(),
		// responseFileParam.getPage()).isPresent())

		return addResponseFileParam(responseFileParam, fileModel, null);
	}

	private void fillResponseFileModel(ResponseFileParam responseFileParam, ResponseFileModel responseFileModel) {
		responseFileModel.setId(responseFileParam.getId());
		responseFileModel.setParam(responseFileParam);
	}

	private void fillResponseFileParam(ResponseFileParam responseFileParam)
			throws ParserConfigurationException, SAXException, IOException {
		var formTemplate = makeFormTemplate(responseFileParam);

		var questions = responseFileParam.getQuestions();
		var groups = formTemplate.getGroups();
		for (var group : groups.entrySet()) {
			group.getValue().getFields().values().stream()
					.sorted(Comparator.comparing(com.albertoborsetta.formscanner.api.FormQuestion::getName))
					.forEach(field -> {
						List<String> responses = makeResponseValues(field);
						var question = questions.get(field.getName());
						if (Objects.isNull(question)) {
							questions.put(field.getName(), new QuestionPageParam(field.getName(),
									getTypeByName(field.getName(), QuestionType.QUESTION), responses));
						} else {
							question.setResponses(responses);
						}

					});
			group.getValue().getAreas().values().stream()
					.sorted(Comparator.comparing(com.albertoborsetta.formscanner.api.FormArea::getName))
					.filter(area -> !questions.containsKey(area.getName()))
					.forEach(area -> questions.put(area.getName(), new QuestionPageParam(area.getName(),
							getTypeByName(area.getName(), QuestionType.PERFORMANCE), new ArrayList<>())));
		}
	}

	private void fillResponseFileParam(ResponseFileParam responseFileParam, ResponseFileModel responseFileModel)
			throws IOException {
		BufferedImage image = ImageIO.read(new ByteArrayInputStream(responseFileModel.getFile().getData()));
		responseFileParam.setHeight(image.getHeight());
		responseFileParam.setWidth(image.getWidth());
	}

	private void validateUniqueStageAndPage(ResponseFileParam responseFileParam) {
		if (Objects.isNull(responseFileParam.getStage()) || Objects.isNull(responseFileParam.getPage())) {
			return;
		}
		getResponseFileParamByStageAndPage(responseFileParam.getStage(), responseFileParam.getPage())
				.filter(existing -> !Objects.equals(existing.getId(), responseFileParam.getId()))
				.ifPresent(existing -> {
					throw new IllegalArgumentException("Un modèle de formulaire existe déjà pour l'épreuve "
							+ responseFileParam.getStage() + ", page " + responseFileParam.getPage() + ".");
				});
	}

	private QuestionType getTypeByName(String name, QuestionType defaultType) {
		if (name.startsWith(PAGE)) {
			return QuestionType.PAGE;
		} else if (name.startsWith(STAGE)) {
			return QuestionType.STAGE;
		} else if (name.startsWith(TEAM)) {
			return QuestionType.TEAM;
		}
		return defaultType;
	}

	private com.albertoborsetta.formscanner.api.FormTemplate makeFormTemplate(ResponseFileParam responseFileParam)
			throws IOException, ParserConfigurationException, SAXException {
		if (Objects.isNull(responseFileParam.getTemplate()))
			return new com.albertoborsetta.formscanner.api.FormTemplate("");
		try {
			return buildFormTemplate(responseFileParam.getTemplate());
		} catch (SAXException ex) {
			// Certains anciens fichiers sont encodés en ISO-8859-1 : on retente en recodant
			String recoded = new String(responseFileParam.getTemplate().getBytes(StandardCharsets.ISO_8859_1),
					StandardCharsets.UTF_8);
			if (!recoded.equals(responseFileParam.getTemplate())) {
				return buildFormTemplate(recoded);
			}
			throw ex;
		}
	}

	private com.albertoborsetta.formscanner.api.FormTemplate buildFormTemplate(String templateContent)
			throws IOException, ParserConfigurationException, SAXException {
		File templateFile = File.createTempFile("rallyeschema-", "-model.xtmpl");
		templateFile.deleteOnExit();
		try (BufferedWriter bw = new BufferedWriter(
				new OutputStreamWriter(new FileOutputStream(templateFile), StandardCharsets.UTF_8))) {
			bw.write(templateContent);
		}
		try {
			return new com.albertoborsetta.formscanner.api.FormTemplate(templateFile);
		} finally {
			templateFile.delete();
		}
	}

	private ResponseFileModel makeResponseFileModel(MultipartFile fileModel, ResponseFileModel responseFileModel)
			throws IOException {
		if (Objects.isNull(responseFileModel))
			responseFileModel = new ResponseFileModel();
		responseFileModel.setFile(new Binary(BsonBinarySubType.BINARY, fileModel.getBytes()));
		responseFileModel.setFileExtension(FilenameUtils.getExtension(fileModel.getOriginalFilename()));
		responseFileModel.setFileType(fileModel.getContentType());
		return responseFileModel;
	}

	private ResponseFileModel makeGeneratedResponseFileModel(GeneratedResponseFileParamRequest generated) {
		ResponseFileModel model = new ResponseFileModel();
		model.setFile(new Binary(BsonBinarySubType.BINARY, Base64.getDecoder().decode(generated.getModelBase64())));
		model.setFileType(Objects.requireNonNullElse(generated.getModelFileType(), "image/png"));
		model.setFileExtension(Objects.requireNonNullElse(generated.getModelFileExtension(), "png"));
		return model;
	}

	private List<String> makeResponseValues(FormQuestion field) {
		List<String> responses = new ArrayList<>();
		if (field.getType() == FieldType.QUESTIONS_BY_ROWS) {
			field.getPoints().entrySet().stream()
					.sorted(Map.Entry.comparingByValue(
							Comparator.comparing(com.albertoborsetta.formscanner.api.FormPoint::getX)))
					.forEach(entry -> responses.add(entry.getKey()));
		} else if (field.getType() == FieldType.QUESTIONS_BY_COLS) {
			field.getPoints().entrySet().stream()
					.sorted(Map.Entry.comparingByValue(
							Comparator.comparing(com.albertoborsetta.formscanner.api.FormPoint::getY)))
					.forEach(entry -> responses.add(entry.getKey()));
		} else if (field.getType() == FieldType.RESPONSES_BY_GRID) {
			field.getPoints().entrySet().stream()
					.sorted(Map.Entry.comparingByValue(
							Comparator.comparing(com.albertoborsetta.formscanner.api.FormPoint::getY)))
					.forEach(entry -> responses.add(entry.getKey()));
		}
		return responses;
	}
}
