package fr.vandriessche.rallyeschema.responseservice.services;

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
import java.util.Objects;
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

import fr.vandriessche.rallyeschema.responseservice.entities.QuestionPageParam;
import fr.vandriessche.rallyeschema.responseservice.entities.QuestionType;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileModel;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileModelRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileParamRepository;
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
	@Autowired
	private StageParamService stageParamService;

	public ResponseFileParam addResponseFileParam(ResponseFileParam responseFileParam, MultipartFile fileModel)
			throws ParserConfigurationException, SAXException, IOException {
		if (Objects.isNull(responseFileParam))
			responseFileParam = new ResponseFileParam();
		if (Objects.nonNull(responseFileParam.getId()))
			responseFileParamRepository.findById(responseFileParam.getId()).orElseThrow();
		// else if (getResponseFileParamByStageAndPage(responseFileParam.getStage(),
		// responseFileParam.getPage()).isPresent())

		fillResponseFileParam(responseFileParam);
		ResponseFileModel responseFileModel = Objects.nonNull(fileModel) ? makeResponseFileModel(fileModel, null)
				: responseFileModelRepository.findById(responseFileParam.getId()).orElseThrow();
		fillResponseFileParam(responseFileParam, responseFileModel);
		responseFileParam = responseFileParamRepository.save(responseFileParam);
		fillResponseFileModel(responseFileParam, responseFileModel);
		responseFileModelRepository.save(responseFileModel);
		stageParamService.updateResponseFileParams(responseFileParam);
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

	public com.albertoborsetta.formscanner.api.FormTemplate makeFormTemplate(Integer stage, Integer page)
			throws ParserConfigurationException, SAXException, IOException {
		var param = getResponseFileParamByStageAndPage(stage, page);
		if (param.isEmpty())
			return makeFormTemplate(1, 1);
		return makeFormTemplate(param.get());
	}

	public ResponseFileParam updateResponseFileParam(ResponseFileParam responseFileParam, MultipartFile fileModel)
			throws ParserConfigurationException, SAXException, IOException {
		responseFileParamRepository.findById(responseFileParam.getId()).orElseThrow();
		// else if (getResponseFileParamByStageAndPage(responseFileParam.getStage(),
		// responseFileParam.getPage()).isPresent())

		return addResponseFileParam(responseFileParam, fileModel);
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

	private com.albertoborsetta.formscanner.api.FormTemplate makeFormTemplate()
			throws ParserConfigurationException, SAXException, IOException {
		File templateFile = new File(templateFileName);
		return new com.albertoborsetta.formscanner.api.FormTemplate(templateFile);
	}

	private com.albertoborsetta.formscanner.api.FormTemplate makeFormTemplate(ResponseFileParam responseFileParam)
			throws IOException, ParserConfigurationException, SAXException {
		if (Objects.isNull(responseFileParam.getTemplate()))
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

	private ResponseFileModel makeResponseFileModel(MultipartFile fileModel, ResponseFileModel responseFileModel)
			throws IOException {
		if (Objects.isNull(responseFileModel))
			responseFileModel = new ResponseFileModel();
		responseFileModel.setFile(new Binary(BsonBinarySubType.BINARY, fileModel.getBytes()));
		responseFileModel.setFileExtension(FilenameUtils.getExtension(fileModel.getOriginalFilename()));
		responseFileModel.setFileType(fileModel.getContentType());
		return responseFileModel;
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
