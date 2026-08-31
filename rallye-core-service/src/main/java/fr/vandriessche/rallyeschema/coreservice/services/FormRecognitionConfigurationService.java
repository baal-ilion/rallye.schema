package fr.vandriessche.rallyeschema.coreservice.services;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
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

import fr.vandriessche.rallyeschema.coreservice.entities.FieldType;
import fr.vandriessche.rallyeschema.coreservice.entities.FormArea;
import fr.vandriessche.rallyeschema.coreservice.entities.FormQuestion;
import fr.vandriessche.rallyeschema.coreservice.entities.FormTemplate;
import fr.vandriessche.rallyeschema.coreservice.entities.FormQuestionDefinition;
import fr.vandriessche.rallyeschema.coreservice.entities.QuestionType;
import fr.vandriessche.rallyeschema.coreservice.entities.FormReferenceImage;
import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormReferenceImageRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormRecognitionConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.models.GeneratedFormRecognitionConfigurationRequest;
import lombok.extern.java.Log;

@Service
@Log
public class FormRecognitionConfigurationService {
	private static final String PAGE = "Page";

	private static final String CHALLENGE = "Challenge";

	private static final String TEAM = "Team";

	@Autowired
	private FormRecognitionConfigurationRepository formRecognitionConfigurationRepository;
	@Autowired
	private FormReferenceImageRepository formReferenceImageRepository;
	@Autowired
	private ChallengeConfigurationService challengeConfigurationService;
	private final FormTemplateXmlParser formTemplateXmlParser = new FormTemplateXmlParser();

	public FormTemplate parseFormTemplate(Integer challenge, Integer page)
			throws ParserConfigurationException, SAXException, IOException {
		FormRecognitionConfiguration configuration = getFormRecognitionConfigurationByChallengeAndPage(challenge, page)
				.orElseGet(() -> getReferenceFormRecognitionConfiguration()
						.orElseThrow(() -> new IllegalStateException("Aucun formulaire de référence n'est configuré.")));
		return parseFormTemplate(configuration);
	}

	public FormRecognitionConfiguration addFormRecognitionConfiguration(FormRecognitionConfiguration formRecognitionConfiguration, MultipartFile fileModel,
			FormReferenceImage fallbackFormReferenceImage) throws ParserConfigurationException, SAXException, IOException {
		if (Objects.isNull(formRecognitionConfiguration))
			formRecognitionConfiguration = new FormRecognitionConfiguration();
		if (Objects.nonNull(formRecognitionConfiguration.getId()))
			formRecognitionConfigurationRepository.findById(formRecognitionConfiguration.getId()).orElseThrow();

		validateUniqueChallengeAndPage(formRecognitionConfiguration);
		fillFormRecognitionConfiguration(formRecognitionConfiguration);
		FormReferenceImage formReferenceImage = Objects.nonNull(fileModel) ? makeFormReferenceImage(fileModel, null)
				: fallbackFormReferenceImage;
		if (Objects.isNull(formReferenceImage))
			formReferenceImage = formReferenceImageRepository.findById(formRecognitionConfiguration.getId()).orElseThrow();
		fillFormRecognitionConfiguration(formRecognitionConfiguration, formReferenceImage);
		formRecognitionConfiguration = formRecognitionConfigurationRepository.save(formRecognitionConfiguration);
		fillFormReferenceImage(formRecognitionConfiguration, formReferenceImage);
		formReferenceImageRepository.save(formReferenceImage);
		challengeConfigurationService.updateFormRecognitionConfigurations(formRecognitionConfiguration);
		return formRecognitionConfiguration;
	}

	public FormRecognitionConfiguration addReferenceFormRecognitionConfiguration(FormRecognitionConfiguration formRecognitionConfiguration,
			FormReferenceImage formReferenceImage) throws ParserConfigurationException, SAXException, IOException {
		formRecognitionConfiguration.setId(null);
		formRecognitionConfiguration.setChallenge(null);
		formRecognitionConfiguration.setPage(null);
		formRecognitionConfiguration.setDesignerManaged(true);
		fillFormRecognitionConfiguration(formRecognitionConfiguration);
		fillFormRecognitionConfiguration(formRecognitionConfiguration, formReferenceImage);
		formRecognitionConfiguration = formRecognitionConfigurationRepository.save(formRecognitionConfiguration);
		fillFormReferenceImage(formRecognitionConfiguration, formReferenceImage);
		formReferenceImageRepository.save(formReferenceImage);
		return formRecognitionConfiguration;
	}

	public void deleteCascadeFormRecognitionConfiguration(String id) {
		var formRecognitionConfiguration = formRecognitionConfigurationRepository.findById(id).orElseThrow();
		challengeConfigurationService.removeFormRecognitionConfiguration(formRecognitionConfiguration);
		deleteFormRecognitionConfiguration(id);
	}

	public void deleteFormRecognitionConfiguration(String id) {
		formReferenceImageRepository.deleteById(id);
		formRecognitionConfigurationRepository.deleteById(id);
	}

	public FormReferenceImage getFormReferenceImage(String id) {
		return formReferenceImageRepository.findById(id).orElseThrow();
	}

	public FormRecognitionConfiguration getFormRecognitionConfiguration(String id) {
		return formRecognitionConfigurationRepository.findById(id).orElseThrow();
	}

	public Optional<FormRecognitionConfiguration> getFormRecognitionConfigurationByChallengeAndPage(Integer challenge, Integer page) {
		return formRecognitionConfigurationRepository.findByChallengeAndPage(challenge, page);
	}

	public List<FormRecognitionConfiguration> getFormRecognitionConfigurations() {
		return formRecognitionConfigurationRepository.findAll();
	}

	public Page<FormRecognitionConfiguration> getFormRecognitionConfigurations(Pageable pageable) {
		return formRecognitionConfigurationRepository.findAll(pageable);
	}

	public List<FormRecognitionConfiguration> getFormRecognitionConfigurationsByChallenge(Integer challenge) {
		return formRecognitionConfigurationRepository.findByChallenge(challenge);
	}

	public Optional<FormRecognitionConfiguration> getReferenceFormRecognitionConfiguration() {
		return formRecognitionConfigurationRepository.findByChallengeIsNullAndPageIsNull();
	}

	public Optional<FormReferenceImage> getReferenceFormReferenceImage() {
		return getReferenceFormRecognitionConfiguration().flatMap(reference -> formReferenceImageRepository.findById(reference.getId()));
	}

	public void deleteFormRecognitionConfigurationsByChallenge(Integer challenge) {
		new ArrayList<>(formRecognitionConfigurationRepository.findByChallenge(challenge))
				.stream().filter(FormRecognitionConfiguration::isDesignerManaged)
				.forEach(configuration -> deleteCascadeFormRecognitionConfiguration(configuration.getId()));
	}

	public List<FormRecognitionConfiguration> replaceGeneratedChallengeFormRecognitionConfigurations(Integer challenge,
			List<GeneratedFormRecognitionConfigurationRequest> generatedPages)
			throws ParserConfigurationException, SAXException, IOException {
		List<FormRecognitionConfiguration> existingPages = formRecognitionConfigurationRepository.findByChallenge(challenge);
		List<FormRecognitionConfiguration> savedPages = new ArrayList<>();
		for (GeneratedFormRecognitionConfigurationRequest generatedPage : generatedPages) {
			FormRecognitionConfiguration configuration = Objects.requireNonNull(generatedPage.getConfiguration(), "Configuration de page absente.");
			configuration.setChallenge(challenge);
			FormRecognitionConfiguration existing = formRecognitionConfigurationRepository.findByChallengeAndPage(challenge, configuration.getPage())
					.orElse(null);
			if (existing != null && !existing.isDesignerManaged()) {
				throw new IllegalStateException("Le formulaire de l'épreuve " + challenge + ", page " + configuration.getPage()
						+ " a été configuré en dehors du designer et ne peut pas être remplacé par celui-ci.");
			}
			configuration.setId(existing == null ? null : existing.getId());
			configuration.setDesignerManaged(true);
			savedPages.add(addFormRecognitionConfiguration(configuration, null, makeGeneratedFormReferenceImage(generatedPage)));
		}
		List<Integer> publishedPageNumbers = savedPages.stream().map(FormRecognitionConfiguration::getPage)
				.collect(java.util.stream.Collectors.toList());
		existingPages.stream().filter(FormRecognitionConfiguration::isDesignerManaged)
				.filter(existing -> !publishedPageNumbers.contains(existing.getPage()))
				.forEach(existing -> deleteCascadeFormRecognitionConfiguration(existing.getId()));
		return savedPages;
	}

	public FormRecognitionConfiguration saveGeneratedReferenceFormRecognitionConfiguration(GeneratedFormRecognitionConfigurationRequest generated)
			throws ParserConfigurationException, SAXException, IOException {
		FormRecognitionConfiguration configuration = Objects.requireNonNull(generated.getConfiguration(), "Configuration de référence absente.");
		configuration.setChallenge(null);
		configuration.setPage(null);
		FormRecognitionConfiguration existingReference = getReferenceFormRecognitionConfiguration().orElse(null);
		if (existingReference != null && !existingReference.isDesignerManaged()) {
			throw new IllegalStateException("Le formulaire de référence a été configuré en dehors du designer et ne peut pas être remplacé par celui-ci.");
		}
		if (existingReference != null)
			configuration.setId(existingReference.getId());
		configuration.setDesignerManaged(true);
		fillFormRecognitionConfiguration(configuration);
		FormReferenceImage referenceImage = makeGeneratedFormReferenceImage(generated);
		fillFormRecognitionConfiguration(configuration, referenceImage);
		configuration = formRecognitionConfigurationRepository.save(configuration);
		fillFormReferenceImage(configuration, referenceImage);
		formReferenceImageRepository.save(referenceImage);
		return configuration;
	}

	public void deleteReferenceFormRecognitionConfiguration() {
		getReferenceFormRecognitionConfiguration().filter(FormRecognitionConfiguration::isDesignerManaged)
				.ifPresent(reference -> deleteFormRecognitionConfiguration(reference.getId()));
	}

	public FormRecognitionConfiguration updateFormRecognitionConfiguration(FormRecognitionConfiguration formRecognitionConfiguration, MultipartFile fileModel)
			throws ParserConfigurationException, SAXException, IOException {
		formRecognitionConfigurationRepository.findById(formRecognitionConfiguration.getId()).orElseThrow();
		// else if (getFormRecognitionConfigurationByChallengeAndPage(formRecognitionConfiguration.getChallenge(),
		// formRecognitionConfiguration.getPage()).isPresent())

		return addFormRecognitionConfiguration(formRecognitionConfiguration, fileModel, null);
	}

	private void fillFormReferenceImage(FormRecognitionConfiguration formRecognitionConfiguration, FormReferenceImage formReferenceImage) {
		formReferenceImage.setId(formRecognitionConfiguration.getId());
		formReferenceImage.setConfiguration(formRecognitionConfiguration);
	}

	private void fillFormRecognitionConfiguration(FormRecognitionConfiguration formRecognitionConfiguration)
			throws ParserConfigurationException, SAXException, IOException {
		var formTemplate = parseFormTemplate(formRecognitionConfiguration);

		var questions = formRecognitionConfiguration.getQuestions();
		var groups = formTemplate.getGroups();
		for (var group : groups.entrySet()) {
			group.getValue().getFields().values().stream()
					.sorted(Comparator.comparing(FormQuestion::getName))
					.forEach(field -> {
						List<String> responses = makeResponseValues(field);
						var question = questions.get(field.getName());
						if (Objects.isNull(question)) {
							questions.put(field.getName(), new FormQuestionDefinition(field.getName(),
									getTypeByName(field.getName(), QuestionType.QUESTION), responses));
						} else {
							question.setResponses(responses);
						}

					});
			group.getValue().getAreas().values().stream()
					.sorted(Comparator.comparing(FormArea::getName))
					.filter(area -> !questions.containsKey(area.getName()))
					.forEach(area -> questions.put(area.getName(), new FormQuestionDefinition(area.getName(),
							getTypeByName(area.getName(), QuestionType.PERFORMANCE), new ArrayList<>())));
		}
	}

	private void fillFormRecognitionConfiguration(FormRecognitionConfiguration formRecognitionConfiguration, FormReferenceImage formReferenceImage)
			throws IOException {
		BufferedImage image = ImageIO.read(new ByteArrayInputStream(formReferenceImage.getFile().getData()));
		formRecognitionConfiguration.setHeight(image.getHeight());
		formRecognitionConfiguration.setWidth(image.getWidth());
	}

	private void validateUniqueChallengeAndPage(FormRecognitionConfiguration formRecognitionConfiguration) {
		if (Objects.isNull(formRecognitionConfiguration.getChallenge()) || Objects.isNull(formRecognitionConfiguration.getPage())) {
			return;
		}
		getFormRecognitionConfigurationByChallengeAndPage(formRecognitionConfiguration.getChallenge(), formRecognitionConfiguration.getPage())
				.filter(existing -> !Objects.equals(existing.getId(), formRecognitionConfiguration.getId()))
				.ifPresent(existing -> {
					throw new IllegalArgumentException("Un modèle de formulaire existe déjà pour l'épreuve "
							+ formRecognitionConfiguration.getChallenge() + ", page " + formRecognitionConfiguration.getPage() + ".");
				});
	}

	private QuestionType getTypeByName(String name, QuestionType defaultType) {
		if (name.startsWith(PAGE)) {
			return QuestionType.PAGE;
		} else if (name.startsWith(CHALLENGE)) {
			return QuestionType.CHALLENGE;
		} else if (name.startsWith(TEAM)) {
			return QuestionType.TEAM;
		}
		return defaultType;
	}

	private FormTemplate parseFormTemplate(FormRecognitionConfiguration formRecognitionConfiguration)
			throws ParserConfigurationException, SAXException, IOException {
		if (Objects.isNull(formRecognitionConfiguration.getTemplate()))
			return new FormTemplate();
		try {
			return formTemplateXmlParser.parse(formRecognitionConfiguration.getTemplate());
		} catch (SAXException ex) {
			String recoded = new String(formRecognitionConfiguration.getTemplate().getBytes(StandardCharsets.ISO_8859_1),
					StandardCharsets.UTF_8);
			if (!recoded.equals(formRecognitionConfiguration.getTemplate()))
				return formTemplateXmlParser.parse(recoded);
			throw ex;
		}
	}

	private FormReferenceImage makeFormReferenceImage(MultipartFile fileModel, FormReferenceImage formReferenceImage)
			throws IOException {
		if (Objects.isNull(formReferenceImage))
			formReferenceImage = new FormReferenceImage();
		formReferenceImage.setFile(new Binary(BsonBinarySubType.BINARY, fileModel.getBytes()));
		formReferenceImage.setFileExtension(FilenameUtils.getExtension(fileModel.getOriginalFilename()));
		formReferenceImage.setFileType(fileModel.getContentType());
		return formReferenceImage;
	}

	private FormReferenceImage makeGeneratedFormReferenceImage(GeneratedFormRecognitionConfigurationRequest generated) {
		FormReferenceImage referenceImage = new FormReferenceImage();
		referenceImage.setFile(new Binary(BsonBinarySubType.BINARY, Base64.getDecoder().decode(generated.getImageBase64())));
		referenceImage.setFileType(Objects.requireNonNullElse(generated.getImageMediaType(), "image/png"));
		referenceImage.setFileExtension(Objects.requireNonNullElse(generated.getImageFileExtension(), "png"));
		return referenceImage;
	}

	private List<String> makeResponseValues(FormQuestion field) {
		List<String> responses = new ArrayList<>();
		if (field.getType() == FieldType.QUESTIONS_BY_ROWS) {
			field.getPoints().entrySet().stream()
					.sorted(Map.Entry.comparingByValue(
							Comparator.comparing(fr.vandriessche.rallyeschema.coreservice.entities.FormPoint::getX)))
					.forEach(entry -> responses.add(entry.getKey()));
		} else if (field.getType() == FieldType.QUESTIONS_BY_COLS) {
			field.getPoints().entrySet().stream()
					.sorted(Map.Entry.comparingByValue(
							Comparator.comparing(fr.vandriessche.rallyeschema.coreservice.entities.FormPoint::getY)))
					.forEach(entry -> responses.add(entry.getKey()));
		} else if (field.getType() == FieldType.RESPONSES_BY_GRID) {
			field.getPoints().entrySet().stream()
					.sorted(Map.Entry.comparingByValue(
							Comparator.comparing(fr.vandriessche.rallyeschema.coreservice.entities.FormPoint::getY)))
					.forEach(entry -> responses.add(entry.getKey()));
		}
		return responses;
	}
}
