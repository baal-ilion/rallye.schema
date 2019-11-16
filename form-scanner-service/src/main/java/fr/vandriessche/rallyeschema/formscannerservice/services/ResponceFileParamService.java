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
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFileModel;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFileParam;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponceFileModelRepository;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponceFileParamRepository;
import lombok.extern.java.Log;

@Service
@Log
public class ResponceFileParamService {
	private static final String PAGE = "Page";

	private static final String STAGE = "Etape";

	private static final String TEAM = "Equipe";

	@Value("${TemplateFileName:unknown}")
	private String templateFileName;

	@Autowired
	private ResponceFileParamRepository responceFileParamRepository;
	@Autowired
	private ResponceFileModelRepository responceFileModelRepository;

	public ResponceFileModel getResponceFileModel(String id) {
		return responceFileModelRepository.findById(id).orElseThrow();
	}

	public ResponceFileParam getResponceFileParam(String id) {
		return responceFileParamRepository.findById(id).orElseThrow();
	}

	public List<ResponceFileParam> getResponceFileParams() {
		return responceFileParamRepository.findAll();
	}

	public Optional<ResponceFileParam> getResponceFileParamByStageAndPage(Integer stage, Integer page) {
		return responceFileParamRepository.findByStageAndPage(stage, page);
	}

	public List<ResponceFileParam> getResponceFileParamsByStage(Integer stage) {
		return responceFileParamRepository.findByStage(stage);
	}

	public Page<ResponceFileParam> getResponceFileParams(Pageable pageable) {
		return responceFileParamRepository.findAll(pageable);
	}

	public ResponceFileParam addResponceFileParam(ResponceFileParam responceFileParam, MultipartFile fileModel)
			throws ParserConfigurationException, SAXException, IOException {
		if (responceFileParam == null)
			responceFileParam = new ResponceFileParam();
		if (responceFileParam.getId() != null)
			responceFileParamRepository.findById(responceFileParam.getId()).orElseThrow();
		// else if (getResponceFileParamByStageAndPage(responceFileParam.getStage(),
		// responceFileParam.getPage()).isPresent())

		fillResponceFileParam(responceFileParam);
		ResponceFileModel responceFileModel = fileModel != null ? makeResponceFileModel(fileModel, null)
				: responceFileModelRepository.findById(responceFileParam.getId()).orElseThrow();
		fillResponceFileParam(responceFileParam, responceFileModel);
		responceFileParam = responceFileParamRepository.save(responceFileParam);
		fillResponceFileModel(responceFileParam, responceFileModel);
		responceFileModelRepository.save(responceFileModel);
		return responceFileParam;
	}

	public ResponceFileParam updateResponceFileParam(ResponceFileParam responceFileParam, MultipartFile fileModel)
			throws ParserConfigurationException, SAXException, IOException {
		responceFileParamRepository.findById(responceFileParam.getId()).orElseThrow();
		// else if (getResponceFileParamByStageAndPage(responceFileParam.getStage(),
		// responceFileParam.getPage()).isPresent())

		return addResponceFileParam(responceFileParam, fileModel);
	}

	public com.albertoborsetta.formscanner.api.FormTemplate makeFormTemplate(Integer stage, Integer page)
			throws ParserConfigurationException, SAXException, IOException {
		var param = getResponceFileParamByStageAndPage(stage, page);
		if (param.isEmpty())
			return makeFormTemplate();
		return makeFormTemplate(param.get());
	}

	private void fillResponceFileModel(ResponceFileParam responceFileParam, ResponceFileModel responceFileModel) {
		responceFileModel.setId(responceFileParam.getId());
		responceFileModel.setParam(responceFileParam);
	}

	private void fillResponceFileParam(ResponceFileParam responceFileParam, ResponceFileModel responceFileModel)
			throws IOException {
		BufferedImage image = ImageIO.read(new ByteArrayInputStream(responceFileModel.getFile().getData()));
		responceFileParam.setHeight(image.getHeight());
		responceFileParam.setWidth(image.getWidth());
	}

	private ResponceFileModel makeResponceFileModel(MultipartFile fileModel, ResponceFileModel responceFileModel)
			throws IOException {
		if (responceFileModel == null)
			responceFileModel = new ResponceFileModel();
		responceFileModel.setFile(new Binary(BsonBinarySubType.BINARY, fileModel.getBytes()));
		responceFileModel.setFileExtension(FilenameUtils.getExtension(fileModel.getOriginalFilename()));
		responceFileModel.setFileType(fileModel.getContentType());
		return responceFileModel;
	}

	private void fillResponceFileParam(ResponceFileParam responceFileParam)
			throws ParserConfigurationException, SAXException, IOException {
		var formTemplate = makeFormTemplate(responceFileParam);

		var questions = responceFileParam.getQuestions();
		var groups = formTemplate.getGroups();
		for (var group : groups.entrySet()) {
			group.getValue().getFields().values().stream()
					.sorted(Comparator.comparing(com.albertoborsetta.formscanner.api.FormQuestion::getName))
					.forEach(field -> {
						List<String> responces = makeResponceValues(field);
						var question = questions.get(field.getName());
						if (question == null) {
							questions.put(field.getName(), new QuestionPageParam(field.getName(),
									getTypeByName(field.getName(), QuestionPageType.QUESTION), responces));
						} else {
							question.setResponces(responces);
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

	private List<String> makeResponceValues(FormQuestion field) {
		List<String> responces = new ArrayList<>();
		if (field.getType() == FieldType.QUESTIONS_BY_ROWS) {
			field.getPoints().entrySet().stream()
					.sorted(Map.Entry.comparingByValue(
							Comparator.comparing(com.albertoborsetta.formscanner.api.FormPoint::getX)))
					.forEach(entry -> responces.add(entry.getKey()));
		} else if (field.getType() == FieldType.QUESTIONS_BY_COLS) {
			field.getPoints().entrySet().stream()
					.sorted(Map.Entry.comparingByValue(
							Comparator.comparing(com.albertoborsetta.formscanner.api.FormPoint::getY)))
					.forEach(entry -> responces.add(entry.getKey()));
		} else if (field.getType() == FieldType.RESPONSES_BY_GRID) {
			field.getPoints().entrySet().stream()
					.sorted(Map.Entry.comparingByValue(
							Comparator.comparing(com.albertoborsetta.formscanner.api.FormPoint::getY)))
					.forEach(entry -> responces.add(entry.getKey()));
		}
		return responces;
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

	private com.albertoborsetta.formscanner.api.FormTemplate makeFormTemplate(ResponceFileParam responceFileParam)
			throws IOException, ParserConfigurationException, SAXException {
		if (responceFileParam.getTemplate() == null)
			return new com.albertoborsetta.formscanner.api.FormTemplate("");
		File templateFile = File.createTempFile("rallyeschema-", "-model.xtmpl");
		templateFile.deleteOnExit();
		try (BufferedWriter bw = new BufferedWriter(new FileWriter(templateFile))) {
			bw.write(responceFileParam.getTemplate());
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
