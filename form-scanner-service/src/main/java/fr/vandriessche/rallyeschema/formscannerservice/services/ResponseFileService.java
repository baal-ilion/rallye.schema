package fr.vandriessche.rallyeschema.formscannerservice.services;

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
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentCatalog;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.bson.BsonBinarySubType;
import org.bson.types.Binary;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
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

import fr.vandriessche.rallyeschema.formscannerservice.entities.FormGroup;
import fr.vandriessche.rallyeschema.formscannerservice.entities.FormPoint;
import fr.vandriessche.rallyeschema.formscannerservice.entities.FormTemplate;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFile;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileInfo;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseFileSource;
import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponseResult;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponseFileInfoRepository;
import fr.vandriessche.rallyeschema.formscannerservice.repositories.ResponseFileRepository;
import fr.vandriessche.rallyeschema.formscannerservice.utils.ResponseFileUtil;
import lombok.extern.java.Log;

@Service
@Log
public class ResponseFileService {
	public static final String RESPONSE_FILE_CREATE_EVENT = "responseFile.create";
	public static final String RESPONSE_FILE_UPDATE_EVENT = "responseFile.update";
	public static final String RESPONSE_FILE_DELETE_EVENT = "responseFile.delete";

	private static final String PAGE = "Page";
	private static final String ETAPE = "Etape";
	private static final String EQUIPE2 = "Equipe2";
	private static final String EQUIPE1 = "Equipe1";

	private static Integer parseInt(String s) {
		try {
			return Integer.parseInt(s);
		} catch (NumberFormatException e) {
			log.log(Level.WARNING, "parseInt error", e);
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
	private MessageProducerService messageProducerService;

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

			responseFileInfo = responseFileInfoRepository.save(responseFileInfo);
			ResponseFile responseFile = new ResponseFile();
			responseFile.setId(responseFileInfo.getId());
			responseFile.setInfo(responseFileInfo);
			responseFile.setFile(new Binary(BsonBinarySubType.BINARY, file.getBytes()));
			responseFile.setFileExtension(FilenameUtils.getExtension(file.getOriginalFilename()));
			responseFile.setFileType(file.getContentType());
			responseFile = responseFileRepository.insert(responseFile);
			messageProducerService.sendMessage(RESPONSE_FILE_CREATE_EVENT, responseFileInfo);
			return responseFile;
		}
	}

	public void deleteResponseFile(String id) {
		ResponseFileInfo responseFileInfo = responseFileInfoRepository.findById(id).orElseThrow();
		responseFileRepository.deleteById(id);
		responseFileInfoRepository.deleteById(id);
		messageProducerService.sendMessage(RESPONSE_FILE_DELETE_EVENT, responseFileInfo);
	}

	public Page<ResponseFileInfo> getNotCheckedResponseFileInfos(Pageable pageable) {
		return responseFileInfoRepository.findByCheckedFalseOrCheckedNull(pageable);
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
					results.add(new ResponseResult(field.getName(), resultValue, source));
				}
			}
		}
		return results;
	}

	public List<ResponseFileInfo> getSameResponseFileInfos(String id) {
		ResponseFileInfo responseFileInfo = responseFileInfoRepository.findById(id).orElseThrow();
		return getSameResponseFileInfos(responseFileInfo);
	}

	public List<ResponseFileInfo> getSameResponseFileInfos(ResponseFileInfo responseFileInfo) {
		return responseFileInfoRepository
				.findByStageAndPageAndTeam(responseFileInfo.getStage(), responseFileInfo.getPage(),
						responseFileInfo.getTeam())
				.stream().filter(item -> !item.getId().equals(responseFileInfo.getId())).collect(Collectors.toList());
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

		if (Objects.nonNull(filledForm))
			updatedResponseFileInfo.setFilledForm(filledForm);
		if (Objects.nonNull(responseFileInfo.getStage()))
			updatedResponseFileInfo.setStage(responseFileInfo.getStage());
		if (Objects.nonNull(responseFileInfo.getPage()))
			updatedResponseFileInfo.setPage(responseFileInfo.getPage());
		if (Objects.nonNull(responseFileInfo.getTeam()))
			updatedResponseFileInfo.setTeam(responseFileInfo.getTeam());
		if (Objects.nonNull(responseFileInfo.getChecked()))
			updatedResponseFileInfo.setChecked(responseFileInfo.getChecked());

		updatedResponseFileInfo = responseFileInfoRepository.save(updatedResponseFileInfo);
		messageProducerService.sendMessage(RESPONSE_FILE_UPDATE_EVENT, updatedResponseFileInfo);
		return updatedResponseFileInfo;
	}

	private void fillResponseFileInfo(FormTemplate filledForm, ResponseFileInfo responseFileInfo) {
		HashMap<String, FormGroup> groups = filledForm.getGroups();
		for (var group : groups.values()) {
			var equipe1 = group.getFields().get(EQUIPE1);
			var equipe2 = group.getFields().get(EQUIPE2);
			if (Objects.nonNull(equipe1) && Objects.nonNull(equipe2))
				responseFileInfo.setTeam(parseInt(equipe1.getValues() + equipe2.getValues()));
			var etape = group.getFields().get(ETAPE);
			if (Objects.nonNull(etape))
				responseFileInfo.setStage(parseInt(etape.getValues()));
			var page = group.getFields().get(PAGE);
			if (Objects.nonNull(page))
				responseFileInfo.setPage(parseInt(page.getValues()));
		}
		if (Objects.isNull(responseFileInfo.getStage()))
			responseFileInfo.setStage(1);
		if (Objects.isNull(responseFileInfo.getPage()))
			responseFileInfo.setPage(1);
	}

	private boolean isTemplateToUpdate(ResponseFileInfo responseFileInfo, ResponseFileInfo updatedResponseFileInfo) {
		return (Objects.nonNull(responseFileInfo.getStage())
				&& !responseFileInfo.getStage().equals(updatedResponseFileInfo.getStage()))
				|| (Objects.nonNull(responseFileInfo.getPage())
						&& !responseFileInfo.getPage().equals(updatedResponseFileInfo.getPage()))
				|| (Objects.nonNull(responseFileInfo.getFilledForm())
						&& !responseFileInfo.getFilledForm().getCorners().isEmpty());
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
		ResponseFileUtil.copyProperties(filledForm, filledForm2);
		filledForm2.setHeight(image.getHeight());
		filledForm2.setWidth(image.getWidth());
		responseFileParamService.getResponseFileParamByStageAndPage(stage, page).ifPresent(responseFileParam -> {
			filledForm2.getParentTemplate().setHeight(responseFileParam.getHeight());
			filledForm2.getParentTemplate().setWidth(responseFileParam.getWidth());
		});
		return filledForm2;
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
}
