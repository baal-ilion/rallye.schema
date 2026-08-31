package fr.vandriessche.rallyeschema.coreservice.services;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.FileNameMap;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import javax.xml.parsers.ParserConfigurationException;

import org.apache.commons.io.FilenameUtils;
import org.bson.BsonBinarySubType;
import org.bson.types.Binary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.databind.ObjectMapper;

import fr.vandriessche.rallyeschema.coreservice.entities.FormReferenceImage;
import fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.coreservice.entities.RallyConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeGroup;
import fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration;
import fr.vandriessche.rallyeschema.coreservice.entities.Team;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormReferenceImageRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormRecognitionConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormDesignRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.RallyConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeGroupRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.TeamRepository;

@Service
public class SharingService {
	private static final String CHALLENGE_GROUP = "challengeGroup/";
	private static final String CHALLENGE_GROUP_REGEX = "^challengeGroup/[^/]+[.]json$";
	private static final String CHALLENGE_CONFIGURATION = "challengeConfiguration/";
	private static final String CHALLENGE_CONFIGURATION_REGEX = "^challengeConfiguration/[^/]+/[^/]+[.]json$";
	private static final String TEAM = "team/";
	private static final String TEAM_REGEX = "^team/[^/]+[.]json$";
	private static final String FORM_RECOGNITION_CONFIGURATION_REGEX = "^challengeConfiguration/[^/]+/formRecognitionConfiguration-[^/]+/configuration-[^/]+[.]json$";
	private static final String FORM_TEMPLATE_REGEX = "^challengeConfiguration/[^/]+/formRecognitionConfiguration-[^/]+/template-[^/]*[.]xtmpl$";
	private static final String FORM_REFERENCE_IMAGE_REGEX = "^challengeConfiguration/[^/]+/formRecognitionConfiguration-[^/]+/reference-image-[^/]*$";
	private static final String RALLY_CONFIGURATION = "rally/configuration.json";
	private static final String FORM_DESIGN = "formDesign/";
	private static final String FORM_DESIGN_REGEX = "^formDesign/[^/]+[.]json$";
	private static final String REFERENCE = "reference/";
	private static final String REFERENCE_CONFIGURATION = REFERENCE + "configuration-reference.json";
	private static final String REFERENCE_TEMPLATE = REFERENCE + "template-reference.xtmpl";
	private static final String REFERENCE_IMAGE_REGEX = "^reference/reference-image-reference[.][^/]+$";

	@Autowired
	private TeamService teamService;
	@Autowired
	private ChallengeConfigurationService challengeConfigurationService;
	@Autowired
	private FormRecognitionConfigurationService formRecognitionConfigurationService;
	@Autowired
	private TeamRepository teamRepository;
	@Autowired
	private ChallengeConfigurationRepository challengeConfigurationRepository;
	@Autowired
	private ChallengeGroupRepository challengeGroupRepository;
	@Autowired
	private FormRecognitionConfigurationRepository formRecognitionConfigurationRepository;
	@Autowired
	private FormReferenceImageRepository formReferenceImageRepository;
	@Autowired
	private FormDesignRepository formDesignRepository;
	@Autowired
	private RallyConfigurationRepository rallyConfigurationRepository;

	@Autowired
	ObjectMapper objectMapper;

	public void exportConfigurationArchive(OutputStream out) throws IOException {
		ObjectMapper specificObjectMapper = new ObjectMapper().findAndRegisterModules();
		specificObjectMapper.setSerializationInclusion(Include.NON_EMPTY);
		final ZipOutputStream zipOut = new ZipOutputStream(out);
		RallyConfiguration rallyConfiguration = rallyConfigurationRepository.findById(RallyConfiguration.SINGLETON_ID).orElse(new RallyConfiguration());
		writeJson(zipOut, RALLY_CONFIGURATION, rallyConfiguration, specificObjectMapper);

		zipOut.putNextEntry(new ZipEntry(FORM_DESIGN));
		zipOut.closeEntry();
		for (FormDesign design : formDesignRepository.findAll()) {
			writeJson(zipOut, FORM_DESIGN + "formDesign-" + design.getId() + ".json",
					design, specificObjectMapper);
		}

		zipOut.putNextEntry(new ZipEntry(TEAM));
		zipOut.closeEntry();
		for (var team : teamService.getTeams()) {
			writeJson(zipOut, TEAM + "team-" + team.getTeam().toString() + ".json",
					team, specificObjectMapper);
		}
		zipOut.putNextEntry(new ZipEntry(CHALLENGE_GROUP));
		zipOut.closeEntry();
		List<ChallengeGroup> challengeGroups = challengeGroupRepository.findAll();
		for (int i = 0; i < challengeGroups.size(); i++) {
			var challengeGroup = challengeGroups.get(i);
			String suffix = Objects.nonNull(challengeGroup.getId()) ? challengeGroup.getId() : Integer.toString(i + 1);
			writeJson(zipOut, CHALLENGE_GROUP + "challengeGroup-" + suffix + ".json",
					challengeGroup, specificObjectMapper);
		}
		zipOut.putNextEntry(new ZipEntry(CHALLENGE_CONFIGURATION));
		zipOut.closeEntry();
		for (var challengeConfiguration : challengeConfigurationService.getChallengeConfigurations()) {
			var dir = CHALLENGE_CONFIGURATION + "challengeConfiguration-" + challengeConfiguration.getChallenge().toString() + "/";
			zipOut.putNextEntry(new ZipEntry(dir));
			zipOut.closeEntry();
			for (var formRecognitionConfiguration : challengeConfiguration.getFormRecognitionConfigurations()) {
				var formRecognitionConfigurationDir = dir + "formRecognitionConfiguration-" + formRecognitionConfiguration.getChallenge().toString() + "-"
						+ formRecognitionConfiguration.getPage().toString() + "/";
				writeFormRecognitionConfiguration(zipOut, specificObjectMapper, formRecognitionConfiguration,
						formRecognitionConfigurationDir, formRecognitionConfiguration.getChallenge() + "-" + formRecognitionConfiguration.getPage());
			}
			ChallengeConfiguration exportedChallenge = specificObjectMapper.convertValue(challengeConfiguration, ChallengeConfiguration.class);
			exportedChallenge.setFormRecognitionConfigurations(null);
			writeJson(zipOut, dir + "challengeConfiguration-" + challengeConfiguration.getChallenge().toString() + ".json",
					exportedChallenge, specificObjectMapper);
		}

		FormRecognitionConfiguration reference = formRecognitionConfigurationService.getReferenceFormRecognitionConfiguration().orElse(null);
		if (reference != null) {
			writeFormRecognitionConfiguration(zipOut, specificObjectMapper, reference, REFERENCE, "reference");
		}
		zipOut.close();
	}

	private void writeJson(ZipOutputStream zipOut, String name, Object value, ObjectMapper mapper)
			throws IOException {
		zipOut.putNextEntry(new ZipEntry(name));
		zipOut.write(mapper.writeValueAsBytes(value));
		zipOut.closeEntry();
	}

	private void writeFormRecognitionConfiguration(ZipOutputStream zipOut, ObjectMapper mapper,
			FormRecognitionConfiguration formRecognitionConfiguration, String directory, String suffix) throws IOException {
		zipOut.putNextEntry(new ZipEntry(directory));
		zipOut.closeEntry();
		zipOut.putNextEntry(new ZipEntry(directory + "template-" + suffix + ".xtmpl"));
		zipOut.write(formRecognitionConfiguration.getTemplate().getBytes(StandardCharsets.UTF_8));
		zipOut.closeEntry();

		FormReferenceImage formReferenceImage = formRecognitionConfigurationService.getFormReferenceImage(formRecognitionConfiguration.getId());
		zipOut.putNextEntry(new ZipEntry(directory + "reference-image-" + suffix + "." + formReferenceImage.getFileExtension()));
		zipOut.write(formReferenceImage.getFile().getData());
		zipOut.closeEntry();

		FormRecognitionConfiguration exportedConfiguration = mapper.convertValue(formRecognitionConfiguration, FormRecognitionConfiguration.class);
		exportedConfiguration.setId(null);
		exportedConfiguration.setTemplate(null);
		exportedConfiguration.setQuestions(null);
		writeJson(zipOut, directory + "configuration-" + suffix + ".json", exportedConfiguration, mapper);
	}

	@Transactional
	public void importConfigurationArchive(MultipartFile file) throws IOException, ParserConfigurationException, SAXException {
		List<Team> teams = new ArrayList<>();
		List<ChallengeGroup> challengeGroups = new ArrayList<>();
		List<ChallengeConfiguration> challengeConfigurations = new ArrayList<>();
		List<FormDesign> formDesigns = new ArrayList<>();
		List<RallyConfiguration> rallyConfigurations = new ArrayList<>();
		HashMap<String, FormRecognitionConfiguration> formRecognitionConfigurations = new HashMap<>();
		HashMap<String, ByteArrayOutputStream> submittedFormTemplates = new HashMap<>();
		HashMap<String, FormReferenceImage> formReferenceImages = new HashMap<>();
		boolean recognizedEntry = false;
		ZipInputStream zis = new ZipInputStream(file.getInputStream());
		ZipEntry zipEntry = zis.getNextEntry();
		while (zipEntry != null) {
			// ZIP entry names are specified with forward slashes. Some Windows ZIP
			// writers nevertheless emit backslashes, so normalize them before
			// matching the archive contract.
			String name = normalizeZipEntryName(zipEntry.getName());
			if (name.equals(RALLY_CONFIGURATION)) {
				recognizedEntry = true;
				rallyConfigurations.add(readFile(zis, RallyConfiguration.class));
			} else if (name.matches(FORM_DESIGN_REGEX)) {
				recognizedEntry = true;
				formDesigns.add(readFile(zis, FormDesign.class));
			} else if (name.matches(TEAM_REGEX)) {
				recognizedEntry = true;
				teams.add(readFile(zis, Team.class));
			} else if (name.matches(CHALLENGE_GROUP_REGEX)) {
				recognizedEntry = true;
				challengeGroups.add(readFile(zis, ChallengeGroup.class));
			} else if (name.matches(CHALLENGE_CONFIGURATION_REGEX)) {
				recognizedEntry = true;
				challengeConfigurations.add(readFile(zis, ChallengeConfiguration.class));
			} else if (name.matches(FORM_RECOGNITION_CONFIGURATION_REGEX)) {
				recognizedEntry = true;
				var dir = FilenameUtils.getPath(name);
				formRecognitionConfigurations.put(dir, readFile(zis, FormRecognitionConfiguration.class));
			} else if (name.matches(FORM_TEMPLATE_REGEX)) {
				recognizedEntry = true;
				var dir = FilenameUtils.getPath(name);
				submittedFormTemplates.put(dir, readFile(zis));
			} else if (name.matches(FORM_REFERENCE_IMAGE_REGEX)) {
				recognizedEntry = true;
				var dir = FilenameUtils.getPath(name);
				formReferenceImages.put(dir, makeFormReferenceImage(name, zis));
			} else if (name.equals(REFERENCE_CONFIGURATION)) {
				recognizedEntry = true;
				formRecognitionConfigurations.put(REFERENCE, readFile(zis, FormRecognitionConfiguration.class));
			} else if (name.equals(REFERENCE_TEMPLATE)) {
				recognizedEntry = true;
				submittedFormTemplates.put(REFERENCE, readFile(zis));
			} else if (name.matches(REFERENCE_IMAGE_REGEX)) {
				recognizedEntry = true;
				formReferenceImages.put(REFERENCE, makeFormReferenceImage(name, zis));
			}
			zipEntry = zis.getNextEntry();
		}
		zis.closeEntry();
		zis.close();
		if (!recognizedEntry) {
			throw new IOException("L'archive ne contient aucun fichier de configuration reconnu");
		}

		validateSubmittedForms(formRecognitionConfigurations, submittedFormTemplates, formReferenceImages);

		teamRepository.deleteAll();
		challengeConfigurationRepository.deleteAll();
		challengeGroupRepository.deleteAll();
		formRecognitionConfigurationRepository.deleteAll();
		formReferenceImageRepository.deleteAll();
		formDesignRepository.deleteAll();

		for (Team team : teams) {
			teamService.addTeam(team);
		}
		for (ChallengeGroup challengeGroup : challengeGroups) {
			challengeGroupRepository.save(challengeGroup);
		}

		for (ChallengeConfiguration challengeConfiguration : challengeConfigurations) {
			challengeConfiguration.setVersion(null);
			challengeConfiguration.setFormRecognitionConfigurations(new ArrayList<>());
			challengeConfigurationRepository.insert(challengeConfiguration);
		}

		Set<String> submittedFormDirectories = new LinkedHashSet<>();
		submittedFormDirectories.addAll(formRecognitionConfigurations.keySet());
		submittedFormDirectories.addAll(submittedFormTemplates.keySet());
		submittedFormDirectories.addAll(formReferenceImages.keySet());
		for (String dir : submittedFormDirectories) {
			addFormRecognitionConfiguration(dir, formRecognitionConfigurations, submittedFormTemplates, formReferenceImages);
		}

		for (FormDesign formDesign : formDesigns) {
			formDesign.setVersion(null);
			if (FormDesign.REFERENCE_ID.equals(formDesign.getId())) {
				formDesign.setDesignerManaged(true);
			}
			formDesignRepository.insert(formDesign);
		}
		if (!rallyConfigurations.isEmpty()) {
			rallyConfigurationRepository.deleteAll();
			RallyConfiguration rallyConfiguration = rallyConfigurations.get(rallyConfigurations.size() - 1);
			rallyConfiguration.setId(RallyConfiguration.SINGLETON_ID);
			rallyConfiguration.setVersion(null);
			rallyConfigurationRepository.insert(rallyConfiguration);
		}
	}

	static String normalizeZipEntryName(String name) {
		return name.replace('\\', '/');
	}

	private void validateSubmittedForms(HashMap<String, FormRecognitionConfiguration> formRecognitionConfigurations,
			HashMap<String, ByteArrayOutputStream> submittedFormTemplates,
			HashMap<String, FormReferenceImage> formReferenceImages) throws IOException {
		Set<String> directories = new LinkedHashSet<>();
		directories.addAll(formRecognitionConfigurations.keySet());
		directories.addAll(submittedFormTemplates.keySet());
		directories.addAll(formReferenceImages.keySet());
		for (String directory : directories) {
			if (!formRecognitionConfigurations.containsKey(directory)
					|| !submittedFormTemplates.containsKey(directory)
					|| !formReferenceImages.containsKey(directory)) {
				throw new IOException("Archive incomplète pour le formulaire " + directory);
			}
		}
	}

	private void addFormRecognitionConfiguration(String dir, HashMap<String, FormRecognitionConfiguration> formRecognitionConfigurations,
			HashMap<String, ByteArrayOutputStream> submittedFormTemplates,
			HashMap<String, FormReferenceImage> formReferenceImages)
			throws ParserConfigurationException, SAXException, IOException {
		var formRecognitionConfiguration = formRecognitionConfigurations.getOrDefault(dir, null);
		var template = submittedFormTemplates.getOrDefault(dir, null);
		var formReferenceImage = formReferenceImages.getOrDefault(dir, null);
		if (Objects.nonNull(formRecognitionConfiguration) && Objects.nonNull(template) && Objects.nonNull(formReferenceImage)) {
			formRecognitionConfigurations.remove(dir);
			submittedFormTemplates.remove(dir);
			formReferenceImages.remove(dir);

			formRecognitionConfiguration.setTemplate(template.toString(StandardCharsets.UTF_8));
			if (REFERENCE.equals(dir)) {
				formRecognitionConfiguration.setDesignerManaged(true);
			}
			if (REFERENCE.equals(dir)) {
				formRecognitionConfigurationService.addReferenceFormRecognitionConfiguration(formRecognitionConfiguration, formReferenceImage);
			} else {
				formRecognitionConfigurationService.addFormRecognitionConfiguration(formRecognitionConfiguration, null, formReferenceImage);
			}
		}
	}

	private FormReferenceImage makeFormReferenceImage(String fileModelName, ZipInputStream zis) throws IOException {
		var formReferenceImage = new FormReferenceImage();
		formReferenceImage.setFile(new Binary(BsonBinarySubType.BINARY, readFile(zis).toByteArray()));
		formReferenceImage.setFileExtension(FilenameUtils.getExtension(fileModelName));
		FileNameMap fileNameMap = URLConnection.getFileNameMap();
		String mimeType = fileNameMap.getContentTypeFor(fileModelName);
		formReferenceImage.setFileType(mimeType);
		return formReferenceImage;
	}

	private ByteArrayOutputStream readFile(ZipInputStream zis) throws IOException {
		ByteArrayOutputStream fos = new ByteArrayOutputStream();
		byte[] buffer = new byte[1024];
		int len;
		while ((len = zis.read(buffer)) > 0) {
			fos.write(buffer, 0, len);
		}
		fos.close();
		return fos;
	}

	private <T> T readFile(ZipInputStream zis, Class<T> valueType) throws IOException {
		var json = readFile(zis).toString(StandardCharsets.UTF_8);
		return objectMapper.readValue(json, valueType);
	}
}
