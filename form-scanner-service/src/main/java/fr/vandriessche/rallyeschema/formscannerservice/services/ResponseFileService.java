package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.imageio.ImageIO;
import javax.xml.parsers.ParserConfigurationException;

import org.apache.commons.io.FilenameUtils;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentCatalog;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.bson.BsonBinarySubType;
import org.bson.types.Binary;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.SpelParserConfiguration;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import com.albertoborsetta.formscanner.api.commons.Constants.CornerType;
import com.albertoborsetta.formscanner.api.commons.Constants.Corners;
import com.albertoborsetta.formscanner.api.exceptions.FormScannerException;

import fr.vandriessche.rallyeschema.formscannerservice.entities.FormArea;
import fr.vandriessche.rallyeschema.formscannerservice.entities.FormField;
import fr.vandriessche.rallyeschema.formscannerservice.entities.FormGroup;
import fr.vandriessche.rallyeschema.formscannerservice.entities.FormPoint;
import fr.vandriessche.rallyeschema.formscannerservice.entities.FormQuestion;
import fr.vandriessche.rallyeschema.formscannerservice.entities.FormTemplate;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFile;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponseFileInfoRepository;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponseFileRepository;
import lombok.extern.java.Log;

@Service
@Log
public class ResponseFileService {
	private static final String PAGE = "Page";

	private static final String ETAPE = "Etape";

	private static final String EQUIPE2 = "Equipe2";

	private static final String EQUIPE1 = "Equipe1";

	@Value("${TemplateFileName:unknown}")
	private String templateFileName;

	@Autowired
	private ResponseFileRepository responseFileRepository;
	@Autowired
	private ResponseFileInfoRepository responseFileInfoRepository;
	@Autowired
	private StageResultService stageResultService;
	@Autowired
	private ResponseFileParamService responseFileParamService;

	public ResponseFile addResponseFile(MultipartFile file)
			throws IOException, ParserConfigurationException, SAXException, FormScannerException {
		// TODO refuser si ce n'est pas une image

		if ("pdf".equalsIgnoreCase(FilenameUtils.getExtension(file.getOriginalFilename()))) {

			PDDocument pdfDocument = PDDocument.load(file.getBytes());

			PDDocumentCatalog docCatalog = pdfDocument.getDocumentCatalog();
			PDAcroForm acroForm = docCatalog.getAcroForm();
			acroForm.getFields().stream().forEach(field -> {
				log.info(field.getFullyQualifiedName());
				log.info(field.getValueAsString());
			});

			/*
			 * ResponseFileInfo responseFileInfo = new ResponseFileInfo();
			 * 
			 * // fillResponseFileInfo(filledForm, responseFileInfo);
			 * 
			 * activeResponseFile(responseFileInfo);
			 * 
			 * responseFileInfo = responseFileInfoRepository.save(responseFileInfo);
			 * ResponseFile responseFile = new ResponseFile();
			 * responseFile.setId(responseFileInfo.getId());
			 * responseFile.setInfo(responseFileInfo); responseFile.setFile(new
			 * Binary(BsonBinarySubType.BINARY, file.getBytes()));
			 * responseFile.setFileExtension(FilenameUtils.getExtension(file.
			 * getOriginalFilename())); responseFile.setFileType(file.getContentType());
			 * responseFile = responseFileRepository.insert(responseFile);
			 * 
			 * return responseFile.getId();
			 */
			return null;
		} else {
			BufferedImage image = ImageIO.read(new ByteArrayInputStream(file.getBytes()));
			String name = FilenameUtils.getBaseName(file.getOriginalFilename());

			FormTemplate filledForm = makeFormTemplate(image, name, null, null, null);

			ResponseFileInfo responseFileInfo = new ResponseFileInfo();
			fillResponseFileInfo(filledForm, responseFileInfo);
			filledForm = makeFormTemplate(image, name, responseFileInfo.getStage(), responseFileInfo.getPage(), null);
			logFormTemplate(filledForm);
			responseFileInfo.setFilledForm(filledForm);
			activeResponseFile(responseFileInfo);

			responseFileInfo = responseFileInfoRepository.save(responseFileInfo);
			ResponseFile responseFile = new ResponseFile();
			responseFile.setId(responseFileInfo.getId());
			responseFile.setInfo(responseFileInfo);
			responseFile.setFile(new Binary(BsonBinarySubType.BINARY, file.getBytes()));
			responseFile.setFileExtension(FilenameUtils.getExtension(file.getOriginalFilename()));
			responseFile.setFileType(file.getContentType());
			responseFile = responseFileRepository.insert(responseFile);

			return responseFile;
		}
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

	public List<ResponseFileInfo> getResponseFileInfosByStageAndTeam(Integer stage, Integer team) {
		return responseFileInfoRepository.findByStageAndTeamAndActiveIsTrue(stage, team);
	}

	public Page<ResponseFileInfo> getResponseFileInfos(Pageable pageable) {
		return responseFileInfoRepository.findAll(pageable);
	}

	public ResponseFileInfo updateResponseFileInfo(ResponseFileInfo responseFileInfo)
			throws ParserConfigurationException, SAXException, IOException, FormScannerException {
		ResponseFileInfo updatedResponseFileInfo = responseFileInfoRepository.findById(responseFileInfo.getId())
				.orElseThrow();
		// TODO : ajouter un test si l'etapa est reseigné la page doit aussi l'etre
		if (Objects.nonNull(responseFileInfo.getPage()) && Objects.isNull(responseFileInfo.getStage()))
			// si on n'a que le n° de page on considere que l'etape ne change pas
			responseFileInfo.setStage(updatedResponseFileInfo.getStage());

		FormTemplate filledForm = null;
		if (isTemplateToUpdate(responseFileInfo, updatedResponseFileInfo)) {
			filledForm = updateFormTemplate(responseFileInfo, updatedResponseFileInfo);
		}

		boolean changeStage = isStageToChange(responseFileInfo, updatedResponseFileInfo);
		if (Boolean.TRUE.equals(updatedResponseFileInfo.getActive())
				&& (changeStage || (Objects.nonNull(responseFileInfo.getActive())
						&& Boolean.FALSE.equals(responseFileInfo.getActive())))) {
			removeResponseFileToStageResult(updatedResponseFileInfo);
			updatedResponseFileInfo.setActive(false);
		}

		if (Objects.nonNull(filledForm))
			updatedResponseFileInfo.setFilledForm(filledForm);
		if (Objects.nonNull(responseFileInfo.getStage()))
			updatedResponseFileInfo.setStage(responseFileInfo.getStage());
		if (Objects.nonNull(responseFileInfo.getPage()))
			updatedResponseFileInfo.setPage(responseFileInfo.getPage());
		if (Objects.nonNull(responseFileInfo.getTeam()))
			updatedResponseFileInfo.setTeam(responseFileInfo.getTeam());
		if (Objects.nonNull(responseFileInfo.getActive())) {
			updatedResponseFileInfo.setActive(responseFileInfo.getActive());
			if (Boolean.TRUE.equals(responseFileInfo.getActive())) {
				inactiveAllResponseFileInfo(updatedResponseFileInfo.getStage(), updatedResponseFileInfo.getPage(),
						updatedResponseFileInfo.getTeam());
				addResponseFileToStageResult(updatedResponseFileInfo);
			}
		} else if (changeStage) {
			activeResponseFile(updatedResponseFileInfo);
		}

		if (Objects.nonNull(responseFileInfo.getChecked()))
			updatedResponseFileInfo.setChecked(responseFileInfo.getChecked());

		updatedResponseFileInfo = responseFileInfoRepository.save(updatedResponseFileInfo);
		return updatedResponseFileInfo;
	}

	private void test() {
		/*
		 * Map<String, Boolean> context = new HashMap<>(); context.put("question001",
		 * true); context.put("question002", false);
		 */
		StandardEvaluationContext context = new StandardEvaluationContext();
		context.setVariable("question001", true);
		context.setVariable("question002", false);

		context.setConstructorResolvers(new ArrayList<>());
		context.setMethodResolvers(new ArrayList<>());
		context.setPropertyAccessors(new ArrayList<>());

		SpelParserConfiguration config = new SpelParserConfiguration();

		ExpressionParser parser = new SpelExpressionParser(config);

		log.info("question001="
				+ (parser.parseExpression("#question001").getValue(context, Boolean.class) ? "true" : "false"));
		log.info("question002="
				+ (parser.parseExpression("#question002").getValue(context, Boolean.class) ? "true" : "false"));
		log.info("question003=" + (parser
				.parseExpression("null != new fr.vandriessche.rallyeschema.formscannerservice.entities.FormTemplate()")
				.getValue(context, Boolean.class) ? "true" : "false"));

	}

	private FormTemplate updateFormTemplate(ResponseFileInfo responseFileInfo, ResponseFileInfo updatedResponseFileInfo)
			throws IOException, ParserConfigurationException, SAXException, FormScannerException {
		ResponseFile responseFile = responseFileRepository.findById(responseFileInfo.getId()).orElseThrow();

		BufferedImage image = ImageIO.read(new ByteArrayInputStream(responseFile.getFile().getData()));
		String name = responseFile.getInfo().getFilledForm().getName();
		FormTemplate filledForm = makeFormTemplate(image, name,
				Objects.nonNull(responseFileInfo.getStage()) ? responseFileInfo.getStage()
						: updatedResponseFileInfo.getStage(),
				Objects.nonNull(responseFileInfo.getPage()) ? responseFileInfo.getPage()
						: updatedResponseFileInfo.getPage(),
				Objects.nonNull(responseFileInfo.getFilledForm()) ? responseFileInfo.getFilledForm().getCorners()
						: updatedResponseFileInfo.getFilledForm().getCorners());

		ResponseFileInfo info = new ResponseFileInfo();
		fillResponseFileInfo(filledForm, info);
		if (Objects.isNull(responseFileInfo.getTeam()))
			responseFileInfo.setTeam(info.getTeam());
		if (Objects.nonNull(responseFileInfo.getStage())) {
			// l'etape et la page sont choisi on garde le template de cette page
			logFormTemplate(filledForm);
		} else {
			if (!info.getStage().equals(updatedResponseFileInfo.getStage())
					|| !info.getPage().equals(updatedResponseFileInfo.getPage())) {
				filledForm = makeFormTemplate(image, name, info.getStage(), info.getPage(),
						responseFileInfo.getFilledForm().getCorners());
				responseFileInfo.setStage(info.getStage());
				responseFileInfo.setPage(info.getPage());
			}
		}
		return filledForm;
	}

	private boolean isTemplateToUpdate(ResponseFileInfo responseFileInfo, ResponseFileInfo updatedResponseFileInfo) {
		return (Objects.nonNull(responseFileInfo.getStage())
				&& !responseFileInfo.getStage().equals(updatedResponseFileInfo.getStage()))
				|| (Objects.nonNull(responseFileInfo.getPage())
						&& !responseFileInfo.getPage().equals(updatedResponseFileInfo.getPage()))
				|| (Objects.nonNull(responseFileInfo.getFilledForm())
						&& !responseFileInfo.getFilledForm().getCorners().isEmpty());
	}

	private boolean isStageToChange(ResponseFileInfo responseFileInfo, ResponseFileInfo updatedResponseFileInfo) {
		return (Objects.nonNull(responseFileInfo.getStage())
				&& !responseFileInfo.getStage().equals(updatedResponseFileInfo.getStage()))
				|| (Objects.nonNull(responseFileInfo.getPage())
						&& !responseFileInfo.getPage().equals(updatedResponseFileInfo.getPage()))
				|| (Objects.nonNull(responseFileInfo.getTeam())
						&& !responseFileInfo.getTeam().equals(updatedResponseFileInfo.getTeam()));
	}

	private void activeResponseFile(ResponseFileInfo responseFileInfo) {
		var activedIds = responseFileInfoRepository
				.findByStageAndPageAndTeamAndActiveIsTrue(responseFileInfo.getStage(), responseFileInfo.getPage(),
						responseFileInfo.getTeam())
				.stream().map(ResponseFileInfo::getId).collect(Collectors.toList());
		if (activedIds.size() > 0 && !activedIds.contains(responseFileInfo.getId())) {
			// s'il existe déjà un fichier de réponce, on ne prend pas celui-ci en compte
			log.info(MessageFormat.format(
					"Un fichier existe deja pour la page n° {1} de l'étape n° {0} de léquipe n° {2}.",
					responseFileInfo.getStage(), responseFileInfo.getPage(), responseFileInfo.getTeam()));
			responseFileInfo.setActive(false);
			return;
		}
		inactiveAllResponseFileInfo(responseFileInfo.getStage(), responseFileInfo.getPage(),
				responseFileInfo.getTeam());
		responseFileInfo.setActive(true);
		addResponseFileToStageResult(responseFileInfo);
	}

	private void addResponseFileToStageResult(ResponseFileInfo responseFileInfo) {
		List<ResponseResult> results = new ArrayList<>();
		var groups = responseFileInfo.getFilledForm().getGroups();
		for (var group : groups.entrySet()) {
			for (var field : group.getValue().getFields().values()) {
				if (Stream.of(EQUIPE1, EQUIPE2, ETAPE, PAGE).noneMatch(f -> f.equals(field.getName()))) {
					Boolean resultValue = null;
					var pointKeys = field.getPoints().keySet();
					if (pointKeys.contains("O")) {
						resultValue = true;
					} else if (pointKeys.contains("N")) {
						resultValue = false;
					} else if (pointKeys.contains("Y")) {
						resultValue = true;
					}
					results.add(new ResponseResult(field.getName(), resultValue));
				}
			}

			/*
			 * for (var area : group.getValue().getAreas().values()) {
			 * log.info(area.getName() + " : " + area.getText()); }
			 */
		}
		stageResultService.updateResponseResults(responseFileInfo.getStage(), responseFileInfo.getTeam(), results);
	}

	private void inactiveAllResponseFileInfo(Integer stage, Integer page, Integer team) {
		var activedFiles = responseFileInfoRepository.findByStageAndPageAndTeamAndActiveIsTrue(stage, page, team);
		activedFiles.forEach(responseFileInfo -> responseFileInfo.setActive(false));
		responseFileInfoRepository.saveAll(activedFiles);
	}

	private void removeResponseFileToStageResult(ResponseFileInfo responseFileInfo) {
		List<ResponseResult> results = new ArrayList<>();
		var groups = responseFileInfo.getFilledForm().getGroups();
		for (var group : groups.entrySet()) {
			for (var field : group.getValue().getFields().values()) {
				if (Stream.of(EQUIPE1, EQUIPE2, ETAPE, PAGE).noneMatch(f -> f.equals(field.getName()))) {
					results.add(new ResponseResult(field.getName(), null));
				}
			}

			/*
			 * for (var area : group.getValue().getAreas().values()) {
			 * log.info(area.getName() + " : " + area.getText()); }
			 */
		}
		stageResultService.updateResponseResults(responseFileInfo.getStage(), responseFileInfo.getTeam(), results);
		responseFileInfo.setActive(false);
	}

	private void fillResponseFileInfo(FormTemplate filledForm, ResponseFileInfo responseFileInfo) {
		HashMap<String, FormGroup> groups = filledForm.getGroups();
		for (var group : groups.values()) {
			var equipe1 = group.getFields().get(EQUIPE1);
			var equipe2 = group.getFields().get(EQUIPE2);
			if (Objects.nonNull(equipe1) && Objects.nonNull(equipe2))
				responseFileInfo.setTeam(Integer.parseInt(equipe1.getValues() + equipe2.getValues()));
			var etape = group.getFields().get(ETAPE);
			if (Objects.nonNull(etape))
				responseFileInfo.setStage(Integer.parseInt(etape.getValues()));
			var page = group.getFields().get(PAGE);
			if (Objects.nonNull(page))
				responseFileInfo.setPage(Integer.parseInt(page.getValues()));
		}
		if (Objects.isNull(responseFileInfo.getStage()))
			responseFileInfo.setStage(1);
		if (Objects.isNull(responseFileInfo.getPage()))
			responseFileInfo.setPage(1);
	}

	private void logFormTemplate(FormTemplate filledForm) {
		log.info(filledForm.getName());
		var groups = filledForm.getGroups();
		for (var group : groups.entrySet()) {
			log.info(group.getKey());

			for (var field : group.getValue().getFields().values()) {
				log.info(field.getName() + " : " + field.getValues());
			}

			for (var area : group.getValue().getAreas().values()) {
				log.info(area.getName() + " : " + area.getText());
			}
		}
	}

	private FormTemplate makeFormTemplate(BufferedImage image, String name, Integer stage, Integer page,
			HashMap<Corners, FormPoint> corners)
			throws ParserConfigurationException, SAXException, IOException, FormScannerException {

		com.albertoborsetta.formscanner.api.FormTemplate formTemplate = responseFileParamService.makeFormTemplate(stage,
				page);

		Integer threshold = formTemplate.getThreshold() < 0 ? 127 : formTemplate.getThreshold();
		Integer density = formTemplate.getDensity() < 0 ? 40 : formTemplate.getDensity();
		Integer shapeSize = formTemplate.getSize() < 0 ? 15 : formTemplate.getSize();
		CornerType cornerType = Objects.isNull(formTemplate.getCornerType()) ? CornerType.ROUND
				: formTemplate.getCornerType();

		HashMap<String, Integer> crop = Objects.isNull(formTemplate.getCrop()) ? new HashMap<>()
				: formTemplate.getCrop();
		com.albertoborsetta.formscanner.api.FormTemplate filledForm = new com.albertoborsetta.formscanner.api.FormTemplate(
				name, formTemplate);
		filledForm.findCorners(image, threshold, density, cornerType, crop);
		if (Objects.nonNull(corners)) {
			for (var entry : corners.entrySet()) {
				com.albertoborsetta.formscanner.api.FormPoint corner = new com.albertoborsetta.formscanner.api.FormPoint();
				BeanUtils.copyProperties(entry.getValue(), corner);
				filledForm.setCorner(entry.getKey(), corner);
			}
			filledForm.clearPoints();
		}
		filledForm.findPoints(image, threshold, density, shapeSize);
		filledForm.findAreas(image);

		FormTemplate filledForm2 = new FormTemplate();
		filledForm2.setHeight(image.getHeight());
		filledForm2.setWidth(image.getWidth());
		copyProperties(filledForm, filledForm2);

		return filledForm2;
	}

	private static FormTemplate copyProperties(com.albertoborsetta.formscanner.api.FormTemplate source,
			FormTemplate destination) {
		if (Objects.isNull(source))
			return null;
		destination.getGroups().clear();
		source.getGroups().entrySet().stream().forEach(entrie -> destination.getGroups().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormGroup())));

		destination.getCorners().clear();
		source.getCorners().entrySet().stream().forEach(entrie -> destination.getCorners().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormPoint())));

		destination.getPoints().clear();
		source.getFieldPoints().stream()
				.forEach(entrie -> destination.getPoints().add(copyProperties(entrie, new FormPoint())));

		destination.getAreas().clear();
		source.getFieldAreas().stream()
				.forEach(entrie -> destination.getAreas().add(copyProperties(entrie, new FormArea())));

		destination.setParentTemplate(copyProperties(source.getParentTemplate(), new FormTemplate()));

		destination.setCrop(source.getCrop());
		destination.setUsedGroupNames(source.getUsedGroupNames());

		destination.setCornerType(source.getCornerType());
		destination.setShape(source.getShape());
		destination.setName(source.getName());
		destination.setVersion(source.getVersion());
		destination.setRotation(source.getRotation());
		destination.setDiagonal(source.getDiagonal());
		destination.setGroupsEnabled(source.isGroupsEnabled());
		destination.setThreshold(source.getThreshold());
		destination.setDensity(source.getDensity());
		destination.setSize(source.getSize());
		return destination;
	}

	private static FormArea copyProperties(com.albertoborsetta.formscanner.api.FormArea source, FormArea destination) {
		if (Objects.isNull(source))
			return null;
		copyProperties(source, (FormField) destination);

		destination.getCorners().clear();
		source.getCorners().entrySet().stream().forEach(entrie -> destination.getCorners().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormPoint())));

		destination.setText(source.getText());
		return destination;
	}

	private static FormField copyProperties(com.albertoborsetta.formscanner.api.FormField source,
			FormField destination) {
		if (Objects.isNull(source))
			return null;
		destination.setName(source.getName());
		destination.setType(source.getType());
		return destination;
	}

	private static FormPoint copyProperties(com.albertoborsetta.formscanner.api.FormPoint source,
			FormPoint destination) {
		if (Objects.isNull(source))
			return null;
		destination.setX(source.getX());
		destination.setY(source.getY());
		return destination;
	}

	private static FormGroup copyProperties(com.albertoborsetta.formscanner.api.FormGroup source,
			FormGroup destination) {
		if (Objects.isNull(source))
			return null;
		destination.getFields().clear();
		source.getFields().entrySet().stream().forEach(entrie -> destination.getFields().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormQuestion())));

		destination.getAreas().clear();
		source.getAreas().entrySet().stream().forEach(entrie -> destination.getAreas().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormArea())));
		destination.setLastFieldIndex(source.getLastFieldIndex());
		return destination;
	}

	private static FormQuestion copyProperties(com.albertoborsetta.formscanner.api.FormQuestion source,
			FormQuestion destination) {
		if (Objects.isNull(source))
			return null;
		copyProperties(source, (FormField) destination);

		destination.getPoints().clear();
		source.getPoints().entrySet().stream().forEach(entrie -> destination.getPoints().put(entrie.getKey(),
				copyProperties(entrie.getValue(), new FormPoint())));

		destination.setMultiple(source.isMultiple());
		destination.setRejectMultiple(source.rejectMultiple());
		return destination;
	}
}
