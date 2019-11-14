package fr.vandriessche.rallyeschema.formscannerservice.services;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFile;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFileInfo;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceResult;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponceFileInfoRepository;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponceFileRepository;
import lombok.extern.java.Log;

@Service
@Log
public class ResponceFileService {
	private static final String PAGE = "Page";

	private static final String ETAPE = "Etape";

	private static final String EQUIPE2 = "Equipe2";

	private static final String EQUIPE1 = "Equipe1";

	@Value("${TemplateFileName:unknown}")
	private String templateFileName;

	@Autowired
	private ResponceFileRepository responceFileRepository;
	@Autowired
	private ResponceFileInfoRepository responceFileInfoRepository;
	@Autowired
	private StageResultService stageResultService;
	@Autowired
	private ResponceFileParamService responceFileParamService;

	public String addResponceFile(MultipartFile file)
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
			 * ResponceFileInfo responceFileInfo = new ResponceFileInfo();
			 * 
			 * // fillResponceFileInfo(filledForm, responceFileInfo);
			 * 
			 * activeResponceFile(responceFileInfo);
			 * 
			 * responceFileInfo = responceFileInfoRepository.save(responceFileInfo);
			 * ResponceFile responceFile = new ResponceFile();
			 * responceFile.setId(responceFileInfo.getId());
			 * responceFile.setInfo(responceFileInfo); responceFile.setFile(new
			 * Binary(BsonBinarySubType.BINARY, file.getBytes()));
			 * responceFile.setFileExtension(FilenameUtils.getExtension(file.
			 * getOriginalFilename())); responceFile.setFileType(file.getContentType());
			 * responceFile = responceFileRepository.insert(responceFile);
			 * 
			 * return responceFile.getId();
			 */
			return null;
		} else {
			BufferedImage image = ImageIO.read(new ByteArrayInputStream(file.getBytes()));
			String name = FilenameUtils.getBaseName(file.getOriginalFilename());

			FormTemplate filledForm = makeFormTemplate(image, name, null, null, null);

			ResponceFileInfo responceFileInfo = new ResponceFileInfo();
			fillResponceFileInfo(filledForm, responceFileInfo);
			filledForm = makeFormTemplate(image, name, responceFileInfo.getStage(), responceFileInfo.getPage(), null);
			logFormTemplate(filledForm);
			responceFileInfo.setFilledForm(filledForm);
			activeResponceFile(responceFileInfo);

			responceFileInfo = responceFileInfoRepository.save(responceFileInfo);
			ResponceFile responceFile = new ResponceFile();
			responceFile.setId(responceFileInfo.getId());
			responceFile.setInfo(responceFileInfo);
			responceFile.setFile(new Binary(BsonBinarySubType.BINARY, file.getBytes()));
			responceFile.setFileExtension(FilenameUtils.getExtension(file.getOriginalFilename()));
			responceFile.setFileType(file.getContentType());
			responceFile = responceFileRepository.insert(responceFile);

			return responceFile.getId();
		}
	}

	public ResponceFile getResponceFile(String id) {
		return responceFileRepository.findById(id).orElseThrow();
	}

	public ResponceFileInfo getResponceFileInfo(String id) {
		return responceFileInfoRepository.findById(id).orElseThrow();
	}

	public List<ResponceFileInfo> getResponceFileInfos() {
		return responceFileInfoRepository.findAll();
	}

	public List<ResponceFileInfo> getResponceFileInfosByStageAndTeam(Integer stage, Integer team) {
		return responceFileInfoRepository.findByStageAndTeamAndActiveIsTrue(stage, team);
	}

	public Page<ResponceFileInfo> getResponceFileInfos(Pageable pageable) {
		return responceFileInfoRepository.findAll(pageable);
	}

	public ResponceFileInfo updateResponceFileInfo(ResponceFileInfo responceFileInfo)
			throws ParserConfigurationException, SAXException, IOException, FormScannerException {
		ResponceFileInfo updatedResponceFileInfo = responceFileInfoRepository.findById(responceFileInfo.getId())
				.orElseThrow();
		// TODO : ajouter un test si l'etapa est reseigné la page doit aussi l'etre
		if (responceFileInfo.getPage() != null && responceFileInfo.getStage() == null)
			// si on n'a que le n° de page on considere que l'etape ne change pas
			responceFileInfo.setStage(updatedResponceFileInfo.getStage());

		FormTemplate filledForm = null;
		if (isTemplateToUpdate(responceFileInfo, updatedResponceFileInfo)) {
			filledForm = updateFormTemplate(responceFileInfo, updatedResponceFileInfo);
		}

		boolean changeStage = isStageToChange(responceFileInfo, updatedResponceFileInfo);
		if (Boolean.TRUE.equals(updatedResponceFileInfo.getActive()) && (changeStage
				|| (responceFileInfo.getActive() != null && Boolean.FALSE.equals(responceFileInfo.getActive())))) {
			removeResponceFileToStageResult(updatedResponceFileInfo);
			updatedResponceFileInfo.setActive(false);
		}

		if (filledForm != null)
			updatedResponceFileInfo.setFilledForm(filledForm);
		if (responceFileInfo.getStage() != null)
			updatedResponceFileInfo.setStage(responceFileInfo.getStage());
		if (responceFileInfo.getPage() != null)
			updatedResponceFileInfo.setPage(responceFileInfo.getPage());
		if (responceFileInfo.getTeam() != null)
			updatedResponceFileInfo.setTeam(responceFileInfo.getTeam());
		if (responceFileInfo.getActive() != null) {
			updatedResponceFileInfo.setActive(responceFileInfo.getActive());
			if (Boolean.TRUE.equals(responceFileInfo.getActive())) {
				inactiveAllResponceFileInfo(updatedResponceFileInfo.getStage(), updatedResponceFileInfo.getPage(),
						updatedResponceFileInfo.getTeam());
				addResponceFileToStageResult(updatedResponceFileInfo);
			}
		} else if (changeStage) {
			activeResponceFile(updatedResponceFileInfo);
		}

		if (responceFileInfo.getChecked() != null)
			updatedResponceFileInfo.setChecked(responceFileInfo.getChecked());

		updatedResponceFileInfo = responceFileInfoRepository.save(updatedResponceFileInfo);
		return updatedResponceFileInfo;
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

	private FormTemplate updateFormTemplate(ResponceFileInfo responceFileInfo, ResponceFileInfo updatedResponceFileInfo)
			throws IOException, ParserConfigurationException, SAXException, FormScannerException {
		ResponceFile responceFile = responceFileRepository.findById(responceFileInfo.getId()).orElseThrow();

		BufferedImage image = ImageIO.read(new ByteArrayInputStream(responceFile.getFile().getData()));
		String name = responceFile.getInfo().getFilledForm().getName();
		FormTemplate filledForm = makeFormTemplate(image, name,
				responceFileInfo.getStage() != null ? responceFileInfo.getStage() : updatedResponceFileInfo.getStage(),
				responceFileInfo.getPage() != null ? responceFileInfo.getPage() : updatedResponceFileInfo.getPage(),
				responceFileInfo.getFilledForm() != null ? responceFileInfo.getFilledForm().getCorners()
						: updatedResponceFileInfo.getFilledForm().getCorners());

		ResponceFileInfo info = new ResponceFileInfo();
		fillResponceFileInfo(filledForm, info);
		if (responceFileInfo.getTeam() == null)
			responceFileInfo.setTeam(info.getTeam());
		if (responceFileInfo.getStage() != null) {
			// l'etape et la page sont choisi on garde le template de cette page
			logFormTemplate(filledForm);
		} else {
			if (!info.getStage().equals(updatedResponceFileInfo.getStage())
					|| !info.getPage().equals(updatedResponceFileInfo.getPage())) {
				filledForm = makeFormTemplate(image, name, info.getStage(), info.getPage(),
						responceFileInfo.getFilledForm().getCorners());
				responceFileInfo.setStage(info.getStage());
				responceFileInfo.setPage(info.getPage());
			}
		}
		return filledForm;
	}

	private boolean isTemplateToUpdate(ResponceFileInfo responceFileInfo, ResponceFileInfo updatedResponceFileInfo) {
		return (responceFileInfo.getStage() != null
				&& !responceFileInfo.getStage().equals(updatedResponceFileInfo.getStage()))
				|| (responceFileInfo.getPage() != null
						&& !responceFileInfo.getPage().equals(updatedResponceFileInfo.getPage()))
				|| (responceFileInfo.getFilledForm() != null
						&& !responceFileInfo.getFilledForm().getCorners().isEmpty());
	}

	private boolean isStageToChange(ResponceFileInfo responceFileInfo, ResponceFileInfo updatedResponceFileInfo) {
		return (responceFileInfo.getStage() != null
				&& !responceFileInfo.getStage().equals(updatedResponceFileInfo.getStage()))
				|| (responceFileInfo.getPage() != null
						&& !responceFileInfo.getPage().equals(updatedResponceFileInfo.getPage()))
				|| (responceFileInfo.getTeam() != null
						&& !responceFileInfo.getTeam().equals(updatedResponceFileInfo.getTeam()));
	}

	private void activeResponceFile(ResponceFileInfo responceFileInfo) {
		var activedIds = responceFileInfoRepository
				.findByStageAndPageAndTeamAndActiveIsTrue(responceFileInfo.getStage(), responceFileInfo.getPage(),
						responceFileInfo.getTeam())
				.stream().map(ResponceFileInfo::getId).collect(Collectors.toList());
		if (activedIds.size() > 0 && !activedIds.contains(responceFileInfo.getId())) {
			// s'il existe déjà un fichier de réponce, on ne prend pas celui-ci en compte
			log.info(MessageFormat.format(
					"Un fichier existe deja pour la page n° {1} de l'étape n° {0} de léquipe n° {2}.",
					responceFileInfo.getStage(), responceFileInfo.getPage(), responceFileInfo.getTeam()));
			responceFileInfo.setActive(false);
			return;
		}
		inactiveAllResponceFileInfo(responceFileInfo.getStage(), responceFileInfo.getPage(),
				responceFileInfo.getTeam());
		responceFileInfo.setActive(true);
		addResponceFileToStageResult(responceFileInfo);
	}

	private void addResponceFileToStageResult(ResponceFileInfo responceFileInfo) {
		List<ResponceResult> results = new ArrayList<>();
		var groups = responceFileInfo.getFilledForm().getGroups();
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
					results.add(new ResponceResult(field.getName(), resultValue));
				}
			}

			/*
			 * for (var area : group.getValue().getAreas().values()) {
			 * log.info(area.getName() + " : " + area.getText()); }
			 */
		}
		stageResultService.updateResponceResults(responceFileInfo.getStage(), responceFileInfo.getTeam(), results);
	}

	private void inactiveAllResponceFileInfo(Integer stage, Integer page, Integer team) {
		var activedFiles = responceFileInfoRepository.findByStageAndPageAndTeamAndActiveIsTrue(stage, page, team);
		activedFiles.forEach(responceFileInfo -> responceFileInfo.setActive(false));
		responceFileInfoRepository.saveAll(activedFiles);
	}

	private void removeResponceFileToStageResult(ResponceFileInfo responceFileInfo) {
		List<ResponceResult> results = new ArrayList<>();
		var groups = responceFileInfo.getFilledForm().getGroups();
		for (var group : groups.entrySet()) {
			for (var field : group.getValue().getFields().values()) {
				if (Stream.of(EQUIPE1, EQUIPE2, ETAPE, PAGE).noneMatch(f -> f.equals(field.getName()))) {
					results.add(new ResponceResult(field.getName(), null));
				}
			}

			/*
			 * for (var area : group.getValue().getAreas().values()) {
			 * log.info(area.getName() + " : " + area.getText()); }
			 */
		}
		stageResultService.updateResponceResults(responceFileInfo.getStage(), responceFileInfo.getTeam(), results);
		responceFileInfo.setActive(false);
	}

	private void fillResponceFileInfo(FormTemplate filledForm, ResponceFileInfo responceFileInfo) {
		HashMap<String, FormGroup> groups = filledForm.getGroups();
		for (var group : groups.values()) {
			var equipe1 = group.getFields().get(EQUIPE1);
			var equipe2 = group.getFields().get(EQUIPE2);
			if (equipe1 != null && equipe2 != null)
				responceFileInfo.setTeam(Integer.parseInt(equipe1.getValues() + equipe2.getValues()));
			var etape = group.getFields().get(ETAPE);
			if (etape != null)
				responceFileInfo.setStage(Integer.parseInt(etape.getValues()));
			var page = group.getFields().get(PAGE);
			if (page != null)
				responceFileInfo.setPage(Integer.parseInt(page.getValues()));
		}
		if (responceFileInfo.getStage() == null)
			responceFileInfo.setStage(1);
		if (responceFileInfo.getPage() == null)
			responceFileInfo.setPage(1);
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

		com.albertoborsetta.formscanner.api.FormTemplate formTemplate = responceFileParamService.makeFormTemplate(stage,
				page);

		Integer threshold = formTemplate.getThreshold() < 0 ? 127 : formTemplate.getThreshold();
		Integer density = formTemplate.getDensity() < 0 ? 40 : formTemplate.getDensity();
		Integer shapeSize = formTemplate.getSize() < 0 ? 15 : formTemplate.getSize();
		CornerType cornerType = formTemplate.getCornerType() == null ? CornerType.ROUND : formTemplate.getCornerType();

		HashMap<String, Integer> crop = formTemplate.getCrop() == null ? new HashMap<>() : formTemplate.getCrop();
		com.albertoborsetta.formscanner.api.FormTemplate filledForm = new com.albertoborsetta.formscanner.api.FormTemplate(
				name, formTemplate);
		filledForm.findCorners(image, threshold, density, cornerType, crop);
		if (corners != null) {
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
		if (source == null)
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
		if (source == null)
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
		if (source == null)
			return null;
		destination.setName(source.getName());
		destination.setType(source.getType());
		return destination;
	}

	private static FormPoint copyProperties(com.albertoborsetta.formscanner.api.FormPoint source,
			FormPoint destination) {
		if (source == null)
			return null;
		destination.setX(source.getX());
		destination.setY(source.getY());
		return destination;
	}

	private static FormGroup copyProperties(com.albertoborsetta.formscanner.api.FormGroup source,
			FormGroup destination) {
		if (source == null)
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
		if (source == null)
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
