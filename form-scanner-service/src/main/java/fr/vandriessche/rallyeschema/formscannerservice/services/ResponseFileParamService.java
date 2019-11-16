package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.awt.image.BufferedImage;
import java.io.BufferedWriter;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.imageio.ImageIO;
import javax.xml.parsers.ParserConfigurationException;

import org.apache.commons.io.FilenameUtils;
import org.bson.BsonBinarySubType;
import org.bson.types.Binary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import com.albertoborsetta.formscanner.api.FormQuestion;
import com.albertoborsetta.formscanner.api.commons.Constants.FieldType;

import fr.vandriessche.rallyeschema.formscannerservice.entities.QuestionPageParam;
import fr.vandriessche.rallyeschema.formscannerservice.entities.QuestionPageType;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileModel;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponseFileModelRepository;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponseFileParamRepository;
import lombok.extern.java.Log;

@Service
@Log
public class ResponseFileParamService {
	private static final String PAGE = "Page";

	private static final String STAGE = "Etape";

	private static final String TEAM = "Equipe";

	@Value("${TemplateFileName:unknown}")
	private String templateFileName;

	@Autowired
	private ResponseFileParamRepository responseFileParamRepository;
	@Autowired
	private ResponseFileModelRepository responseFileModelRepository;

	public ResponseFileModel getResponseFileModel(String id) {
		return responseFileModelRepository.findById(id).orElseThrow();
	}

	public ResponseFileParam getResponseFileParam(String id) {
		return responseFileParamRepository.findById(id).orElseThrow();
	}

	public List<ResponseFileParam> getResponseFileParams() {
		return responseFileParamRepository.findAll();
	}

	public Optional<ResponseFileParam> getResponseFileParamByStageAndPage(Integer stage, Integer page) {
		return responseFileParamRepository.findByStageAndPage(stage, page);
	}

	public List<ResponseFileParam> getResponseFileParamsByStage(Integer stage) {
		return responseFileParamRepository.findByStage(stage);
	}

	public Page<ResponseFileParam> getResponseFileParams(Pageable pageable) {
		return responseFileParamRepository.findAll(pageable);
	}

	public ResponseFileParam addResponseFileParam(ResponseFileParam responseFileParam, MultipartFile fileModel)
			throws ParserConfigurationException, SAXException, IOException {
		if (responseFileParam == null)
			responseFileParam = new ResponseFileParam();
		if (responseFileParam.getId() != null)
			responseFileParamRepository.findById(responseFileParam.getId()).orElseThrow();
		// else if (getResponseFileParamByStageAndPage(responseFileParam.getStage(),
		// responseFileParam.getPage()).isPresent())

		fillResponseFileParam(responseFileParam);
		ResponseFileModel responseFileModel = fileModel != null ? makeResponseFileModel(fileModel, null)
				: responseFileModelRepository.findById(responseFileParam.getId()).orElseThrow();
		fillResponseFileParam(responseFileParam, responseFileModel);
		responseFileParam = responseFileParamRepository.save(responseFileParam);
		fillResponseFileModel(responseFileParam, responseFileModel);
		responseFileModelRepository.save(responseFileModel);
		return responseFileParam;
	}

	public ResponseFileParam updateResponseFileParam(ResponseFileParam responseFileParam, MultipartFile fileModel)
			throws ParserConfigurationException, SAXException, IOException {
		responseFileParamRepository.findById(responseFileParam.getId()).orElseThrow();
		// else if (getResponseFileParamByStageAndPage(responseFileParam.getStage(),
		// responseFileParam.getPage()).isPresent())

		return addResponseFileParam(responseFileParam, fileModel);
	}

	public com.albertoborsetta.formscanner.api.FormTemplate makeFormTemplate(Integer stage, Integer page)
			throws ParserConfigurationException, SAXException, IOException {
		var param = getResponseFileParamByStageAndPage(stage, page);
		if (param.isEmpty())
			return makeFormTemplate();
		return makeFormTemplate(param.get());
	}

	private void fillResponseFileModel(ResponseFileParam responseFileParam, ResponseFileModel responseFileModel) {
		responseFileModel.setId(responseFileParam.getId());
		responseFileModel.setParam(responseFileParam);
	}

	private void fillResponseFileParam(ResponseFileParam responseFileParam, ResponseFileModel responseFileModel)
			throws IOException {
		BufferedImage image = ImageIO.read(new ByteArrayInputStream(responseFileModel.getFile().getData()));
		responseFileParam.setHeight(image.getHeight());
		responseFileParam.setWidth(image.getWidth());
	}

	private ResponseFileModel makeResponseFileModel(MultipartFile fileModel, ResponseFileModel responseFileModel)
			throws IOException {
		if (responseFileModel == null)
			responseFileModel = new ResponseFileModel();
		responseFileModel.setFile(new Binary(BsonBinarySubType.BINARY, fileModel.getBytes()));
		responseFileModel.setFileExtension(FilenameUtils.getExtension(fileModel.getOriginalFilename()));
		responseFileModel.setFileType(fileModel.getContentType());
		return responseFileModel;
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
						if (question == null) {
							questions.put(field.getName(), new QuestionPageParam(field.getName(),
									getTypeByName(field.getName(), QuestionPageType.QUESTION), responses));
						} else {
							question.setResponses(responses);
						}

					});
			group.getValue().getAreas().values().stream()
					.sorted(Comparator.comparing(com.albertoborsetta.formscanner.api.FormArea::getName))
					.filter(area -> !questions.containsKey(area.getName())).forEach(area -> {
						questions.put(area.getName(), new QuestionPageParam(area.getName(),
								getTypeByName(area.getName(), QuestionPageType.PERFORMANCE), new ArrayList<>()));
					});
		}
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

	private QuestionPageType getTypeByName(String name, QuestionPageType defaultType) {
		if (name.startsWith(PAGE)) {
			return QuestionPageType.PAGE;
		} else if (name.startsWith(STAGE)) {
			return QuestionPageType.STAGE;
		} else if (name.startsWith(TEAM)) {
			return QuestionPageType.TEAM;
		}
		return defaultType;
	}

	private com.albertoborsetta.formscanner.api.FormTemplate makeFormTemplate(ResponseFileParam responseFileParam)
			throws IOException, ParserConfigurationException, SAXException {
		if (responseFileParam.getTemplate() == null)
			return new com.albertoborsetta.formscanner.api.FormTemplate("");
		File templateFile = File.createTempFile("rallyeschema-", "-model.xtmpl");
		templateFile.deleteOnExit();
		try (BufferedWriter bw = new BufferedWriter(new FileWriter(templateFile))) {
			bw.write(responseFileParam.getTemplate());
		}
		var formTemplate = new com.albertoborsetta.formscanner.api.FormTemplate(templateFile);
		templateFile.delete();
		return formTemplate;
	}

	private com.albertoborsetta.formscanner.api.FormTemplate makeFormTemplate()
			throws ParserConfigurationException, SAXException, IOException {
		File templateFile = new File(templateFileName);
		return new com.albertoborsetta.formscanner.api.FormTemplate(templateFile);
	}
}
