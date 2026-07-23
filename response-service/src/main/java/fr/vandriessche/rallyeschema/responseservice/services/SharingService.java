package fr.vandriessche.rallyeschema.responseservice.services;

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

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileModel;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileParam;
import fr.vandriessche.rallyeschema.responseservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.responseservice.entities.RallyParam;
import fr.vandriessche.rallyeschema.responseservice.entities.StageGroup;
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileModelRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.FormDesignRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.RallyParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageGroupRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamInfoRepository;

@Service
public class SharingService {
	private static final String STAGE_GROUP = "stageGroup/";
	private static final String STAGE_GROUP_REGEX = "^stageGroup/[^/]+[.]json$";
	private static final String STAGE_PARAM = "stageParam/";
	private static final String STAGE_PARAM_REGEX = "^stageParam/[^/]+/[^/]+[.]json$";
	private static final String TEAM_INFO = "teamInfo/";
	private static final String TEAM_INFO_REGEX = "^teamInfo/[^/]+[.]json$";
	private static final String RESPONSE_FILE_PARAM_REGEX = "^stageParam/[^/]+/[^/]+/[^/]+[.]json$";
	private static final String RESPONSE_FILE_TEMPLATE_REGEX = "^stageParam/[^/]+/[^/]+/template-[^/]*[.]xtmpl$";
	private static final String RESPONSE_FILE_MODEL_REGEX = "^stageParam/[^/]+/[^/]+/model-[^/]*$";
	private static final String RALLY_PARAM = "rally/rally.json";
	private static final String FORM_DESIGN = "formDesign/";
	private static final String FORM_DESIGN_REGEX = "^formDesign/[^/]+[.]json$";
	private static final String REFERENCE = "reference/";
	private static final String REFERENCE_PARAM = REFERENCE + "responseFile-reference.json";
	private static final String REFERENCE_TEMPLATE = REFERENCE + "template-reference.xtmpl";
	private static final String REFERENCE_MODEL_REGEX = "^reference/model-reference[.][^/]+$";

	@Autowired
	private TeamInfoService teamInfoService;
	@Autowired
	private StageParamService stageParamService;
	@Autowired
	private ResponseFileParamService responseFileParamService;
	@Autowired
	private TeamInfoRepository teamInfoRepository;
	@Autowired
	private StageParamRepository stageParamRepository;
	@Autowired
	private StageGroupRepository stageGroupRepository;
	@Autowired
	private ResponseFileParamRepository responseFileParamRepository;
	@Autowired
	private ResponseFileModelRepository responseFileModelRepository;
	@Autowired
	private FormDesignRepository formDesignRepository;
	@Autowired
	private RallyParamRepository rallyParamRepository;

	@Autowired
	ObjectMapper objectMapper;

	public void loadParamZip(OutputStream out) throws IOException {
		ObjectMapper specificObjectMapper = new ObjectMapper().findAndRegisterModules();
		specificObjectMapper.setSerializationInclusion(Include.NON_EMPTY);
		final ZipOutputStream zipOut = new ZipOutputStream(out);
		RallyParam rallyParam = rallyParamRepository.findById(RallyParam.SINGLETON_ID).orElse(new RallyParam());
		writeJson(zipOut, RALLY_PARAM, rallyParam, specificObjectMapper);

		zipOut.putNextEntry(new ZipEntry(FORM_DESIGN));
		zipOut.closeEntry();
		for (FormDesign design : formDesignRepository.findAll()) {
			writeJson(zipOut, FORM_DESIGN + "formDesign-" + design.getId() + ".json",
					design, specificObjectMapper);
		}

		zipOut.putNextEntry(new ZipEntry(TEAM_INFO));
		zipOut.closeEntry();
		for (var teamInfo : teamInfoService.getTeamInfos()) {
			writeJson(zipOut, TEAM_INFO + "teamInfo-" + teamInfo.getTeam().toString() + ".json",
					teamInfo, specificObjectMapper);
		}
		zipOut.putNextEntry(new ZipEntry(STAGE_GROUP));
		zipOut.closeEntry();
		List<StageGroup> stageGroups = stageGroupRepository.findAll();
		for (int i = 0; i < stageGroups.size(); i++) {
			var stageGroup = stageGroups.get(i);
			String suffix = Objects.nonNull(stageGroup.getId()) ? stageGroup.getId() : Integer.toString(i + 1);
			writeJson(zipOut, STAGE_GROUP + "stageGroup-" + suffix + ".json",
					stageGroup, specificObjectMapper);
		}
		zipOut.putNextEntry(new ZipEntry(STAGE_PARAM));
		zipOut.closeEntry();
		for (var stageParam : stageParamService.getStageParams()) {
			var dir = STAGE_PARAM + "stageParam-" + stageParam.getStage().toString() + "/";
			zipOut.putNextEntry(new ZipEntry(dir));
			zipOut.closeEntry();
			for (var responseFileParam : stageParam.getResponseFileParams()) {
				var responseFileParamDir = dir + "responseFile-" + responseFileParam.getStage().toString() + "-"
						+ responseFileParam.getPage().toString() + "/";
				writeResponseFile(zipOut, specificObjectMapper, responseFileParam,
						responseFileParamDir, responseFileParam.getStage() + "-" + responseFileParam.getPage());
			}
			StageParam exportedStage = specificObjectMapper.convertValue(stageParam, StageParam.class);
			exportedStage.setResponseFileParams(null);
			writeJson(zipOut, dir + "stageParam-" + stageParam.getStage().toString() + ".json",
					exportedStage, specificObjectMapper);
		}

		ResponseFileParam reference = responseFileParamService.getReferenceResponseFileParam().orElse(null);
		if (reference != null) {
			writeResponseFile(zipOut, specificObjectMapper, reference, REFERENCE, "reference");
		}
		zipOut.close();
	}

	private void writeJson(ZipOutputStream zipOut, String name, Object value, ObjectMapper mapper)
			throws IOException {
		zipOut.putNextEntry(new ZipEntry(name));
		zipOut.write(mapper.writeValueAsBytes(value));
		zipOut.closeEntry();
	}

	private void writeResponseFile(ZipOutputStream zipOut, ObjectMapper mapper,
			ResponseFileParam responseFileParam, String directory, String suffix) throws IOException {
		zipOut.putNextEntry(new ZipEntry(directory));
		zipOut.closeEntry();
		zipOut.putNextEntry(new ZipEntry(directory + "template-" + suffix + ".xtmpl"));
		zipOut.write(responseFileParam.getTemplate().getBytes(StandardCharsets.UTF_8));
		zipOut.closeEntry();

		ResponseFileModel responseFileModel = responseFileParamService.getResponseFileModel(responseFileParam.getId());
		zipOut.putNextEntry(new ZipEntry(directory + "model-" + suffix + "." + responseFileModel.getFileExtension()));
		zipOut.write(responseFileModel.getFile().getData());
		zipOut.closeEntry();

		ResponseFileParam exportedParam = mapper.convertValue(responseFileParam, ResponseFileParam.class);
		exportedParam.setId(null);
		exportedParam.setTemplate(null);
		exportedParam.setQuestions(null);
		writeJson(zipOut, directory + "responseFile-" + suffix + ".json", exportedParam, mapper);
	}

	@Transactional
	public void uploadParamZip(MultipartFile file) throws IOException, ParserConfigurationException, SAXException {
		List<TeamInfo> teamInfos = new ArrayList<>();
		List<StageGroup> stageGroups = new ArrayList<>();
		List<StageParam> stageParams = new ArrayList<>();
		List<FormDesign> formDesigns = new ArrayList<>();
		List<RallyParam> rallyParams = new ArrayList<>();
		HashMap<String, ResponseFileParam> responseFileParams = new HashMap<>();
		HashMap<String, ByteArrayOutputStream> responseFileTemplates = new HashMap<>();
		HashMap<String, ResponseFileModel> responseFileModels = new HashMap<>();
		ZipInputStream zis = new ZipInputStream(file.getInputStream());
		ZipEntry zipEntry = zis.getNextEntry();
		while (zipEntry != null) {
			String name = zipEntry.getName();
			if (name.equals(RALLY_PARAM)) {
				rallyParams.add(readFile(zis, RallyParam.class));
			} else if (name.matches(FORM_DESIGN_REGEX)) {
				formDesigns.add(readFile(zis, FormDesign.class));
			} else if (name.matches(TEAM_INFO_REGEX)) {
				teamInfos.add(readFile(zis, TeamInfo.class));
			} else if (name.matches(STAGE_GROUP_REGEX)) {
				stageGroups.add(readFile(zis, StageGroup.class));
			} else if (name.matches(STAGE_PARAM_REGEX)) {
				stageParams.add(readFile(zis, StageParam.class));
			} else if (name.matches(RESPONSE_FILE_PARAM_REGEX)) {
				var dir = FilenameUtils.getPath(name);
				responseFileParams.put(dir, readFile(zis, ResponseFileParam.class));
			} else if (name.matches(RESPONSE_FILE_TEMPLATE_REGEX)) {
				var dir = FilenameUtils.getPath(name);
				responseFileTemplates.put(dir, readFile(zis));
			} else if (name.matches(RESPONSE_FILE_MODEL_REGEX)) {
				var dir = FilenameUtils.getPath(name);
				responseFileModels.put(dir, makeResponseFileModel(name, zis));
			} else if (name.equals(REFERENCE_PARAM)) {
				responseFileParams.put(REFERENCE, readFile(zis, ResponseFileParam.class));
			} else if (name.equals(REFERENCE_TEMPLATE)) {
				responseFileTemplates.put(REFERENCE, readFile(zis));
			} else if (name.matches(REFERENCE_MODEL_REGEX)) {
				responseFileModels.put(REFERENCE, makeResponseFileModel(name, zis));
			}
			zipEntry = zis.getNextEntry();
		}
		zis.closeEntry();
		zis.close();

		validateResponseFiles(responseFileParams, responseFileTemplates, responseFileModels);

		teamInfoRepository.deleteAll();
		stageParamRepository.deleteAll();
		stageGroupRepository.deleteAll();
		responseFileParamRepository.deleteAll();
		responseFileModelRepository.deleteAll();
		formDesignRepository.deleteAll();

		for (TeamInfo teamInfo : teamInfos) {
			teamInfoService.addTeamInfo(teamInfo);
		}
		for (StageGroup stageGroup : stageGroups) {
			stageGroupRepository.save(stageGroup);
		}

		for (StageParam stageParam : stageParams) {
			stageParam.setVersion(null);
			stageParam.setResponseFileParams(new ArrayList<>());
			stageParamRepository.insert(stageParam);
		}

		Set<String> responseFileDirectories = new LinkedHashSet<>();
		responseFileDirectories.addAll(responseFileParams.keySet());
		responseFileDirectories.addAll(responseFileTemplates.keySet());
		responseFileDirectories.addAll(responseFileModels.keySet());
		for (String dir : responseFileDirectories) {
			addResponseFileParam(dir, responseFileParams, responseFileTemplates, responseFileModels);
		}

		for (FormDesign formDesign : formDesigns) {
			formDesign.setVersion(null);
			formDesignRepository.insert(formDesign);
		}
		if (!rallyParams.isEmpty()) {
			rallyParamRepository.deleteAll();
			RallyParam rallyParam = rallyParams.get(rallyParams.size() - 1);
			rallyParam.setId(RallyParam.SINGLETON_ID);
			rallyParam.setVersion(null);
			rallyParamRepository.insert(rallyParam);
		}
	}

	private void validateResponseFiles(HashMap<String, ResponseFileParam> responseFileParams,
			HashMap<String, ByteArrayOutputStream> responseFileTemplates,
			HashMap<String, ResponseFileModel> responseFileModels) throws IOException {
		Set<String> directories = new LinkedHashSet<>();
		directories.addAll(responseFileParams.keySet());
		directories.addAll(responseFileTemplates.keySet());
		directories.addAll(responseFileModels.keySet());
		for (String directory : directories) {
			if (!responseFileParams.containsKey(directory)
					|| !responseFileTemplates.containsKey(directory)
					|| !responseFileModels.containsKey(directory)) {
				throw new IOException("Archive incomplète pour le formulaire " + directory);
			}
		}
	}

	private void addResponseFileParam(String dir, HashMap<String, ResponseFileParam> responseFileParams,
			HashMap<String, ByteArrayOutputStream> responseFileTemplates,
			HashMap<String, ResponseFileModel> responseFileModels)
			throws ParserConfigurationException, SAXException, IOException {
		var responseFileParam = responseFileParams.getOrDefault(dir, null);
		var template = responseFileTemplates.getOrDefault(dir, null);
		var model = responseFileModels.getOrDefault(dir, null);
		if (Objects.nonNull(responseFileParam) && Objects.nonNull(template) && Objects.nonNull(model)) {
			responseFileParams.remove(dir);
			responseFileTemplates.remove(dir);
			responseFileModels.remove(dir);

			responseFileParam.setTemplate(template.toString(StandardCharsets.UTF_8));
			if (REFERENCE.equals(dir)) {
				responseFileParamService.addReferenceResponseFileParam(responseFileParam, model);
			} else {
				responseFileParamService.addResponseFileParam(responseFileParam, null, model);
			}
		}
	}

	private ResponseFileModel makeResponseFileModel(String fileModelName, ZipInputStream zis) throws IOException {
		var responseFileModel = new ResponseFileModel();
		responseFileModel.setFile(new Binary(BsonBinarySubType.BINARY, readFile(zis).toByteArray()));
		responseFileModel.setFileExtension(FilenameUtils.getExtension(fileModelName));
		FileNameMap fileNameMap = URLConnection.getFileNameMap();
		String mimeType = fileNameMap.getContentTypeFor(fileModelName);
		responseFileModel.setFileType(mimeType);
		return responseFileModel;
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
