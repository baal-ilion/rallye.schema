package fr.vandriessche.rallyeschema.responseservice.services;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.FileNameMap;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Objects;
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
import fr.vandriessche.rallyeschema.responseservice.entities.StageParam;
import fr.vandriessche.rallyeschema.responseservice.entities.TeamInfo;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileModelRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.ResponseFileParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageParamRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.TeamInfoRepository;

@Service
public class SharingService {
	private static final String STAGE_PARAM = "stageParam/";
	private static final String STAGE_PARAM_REGEX = "^stageParam/[^/]+/[^/]+[.]json$";
	private static final String TEAM_INFO = "teamInfo/";
	private static final String TEAM_INFO_REGEX = "^teamInfo/[^/]+[.]json$";
	private static final String RESPONSE_FILE_PARAM_REGEX = "^stageParam/[^/]+/[^/]+/[^/]+[.]json$";
	private static final String RESPONSE_FILE_TEMPLATE_REGEX = "^stageParam/[^/]+/[^/]+/template-[^/]*[.]xtmpl$";
	private static final String RESPONSE_FILE_MODEL_REGEX = "^stageParam/[^/]+/[^/]+/model-[^/]*$";

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
	private ResponseFileParamRepository responseFileParamRepository;
	@Autowired
	private ResponseFileModelRepository responseFileModelRepository;

	@Autowired
	ObjectMapper objectMapper;

	public void loadParamZip(OutputStream out) throws IOException {
		ObjectMapper specificObjectMapper = new ObjectMapper();
		specificObjectMapper.setSerializationInclusion(Include.NON_EMPTY);
		final ZipOutputStream zipOut = new ZipOutputStream(out);
		zipOut.putNextEntry(new ZipEntry(TEAM_INFO));
		zipOut.closeEntry();
		for (var teamInfo : teamInfoService.getTeamInfos()) {
			final ZipEntry zipEntry = new ZipEntry(TEAM_INFO + "teamInfo-" + teamInfo.getTeam().toString() + ".json");
			zipOut.putNextEntry(zipEntry);
			teamInfo.setId(null);
			byte[] json = specificObjectMapper.writeValueAsBytes(teamInfo);
			zipOut.write(json);
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
				zipOut.putNextEntry(new ZipEntry(responseFileParamDir));
				zipOut.closeEntry();
				final ZipEntry template = new ZipEntry(
						responseFileParamDir + "template-" + responseFileParam.getStage().toString() + "-"
								+ responseFileParam.getPage().toString() + ".xtmpl");
				zipOut.putNextEntry(template);
				byte[] buff = responseFileParam.getTemplate().getBytes(StandardCharsets.UTF_8);
				zipOut.write(buff);

				ResponseFileModel responseFileModel = responseFileParamService
						.getResponseFileModel(responseFileParam.getId());
				final ZipEntry model = new ZipEntry(
						responseFileParamDir + "model-" + responseFileParam.getStage().toString() + "-"
								+ responseFileParam.getPage().toString() + "." + responseFileModel.getFileExtension());
				zipOut.putNextEntry(model);
				buff = responseFileModel.getFile().getData();
				zipOut.write(buff);

				final ZipEntry zipEntry = new ZipEntry(
						responseFileParamDir + "responseFile-" + responseFileParam.getStage().toString() + "-"
								+ responseFileParam.getPage().toString() + ".json");
				zipOut.putNextEntry(zipEntry);
				responseFileParam.setId(null);
				responseFileParam.setTemplate(null);
				responseFileParam.setQuestions(null);
				byte[] json = specificObjectMapper.writeValueAsBytes(responseFileParam);
				zipOut.write(json);
			}
			stageParam.setId(null);
			stageParam.setResponseFileParams(null);
			final ZipEntry zipEntry = new ZipEntry(dir + "stageParam-" + stageParam.getStage().toString() + ".json");
			zipOut.putNextEntry(zipEntry);
			byte[] json = specificObjectMapper.writeValueAsBytes(stageParam);
			zipOut.write(json);
		}
		zipOut.close();
	}

	@Transactional
	public void uploadParamZip(MultipartFile file) throws IOException, ParserConfigurationException, SAXException {
		teamInfoRepository.deleteAll();
		stageParamRepository.deleteAll();
		responseFileParamRepository.deleteAll();
		responseFileModelRepository.deleteAll();

		HashMap<String, ResponseFileParam> responseFileParams = new HashMap<>();
		HashMap<String, ByteArrayOutputStream> responseFileTemplates = new HashMap<>();
		HashMap<String, ResponseFileModel> responseFileModels = new HashMap<>();
		ZipInputStream zis = new ZipInputStream(file.getInputStream());
		ZipEntry zipEntry = zis.getNextEntry();
		while (zipEntry != null) {
			String name = zipEntry.getName();
			if (name.matches(TEAM_INFO_REGEX)) {
				TeamInfo teamInfo = readFile(zis, TeamInfo.class);
				teamInfoService.addTeamInfo(teamInfo);
			} else if (name.matches(STAGE_PARAM_REGEX)) {
				StageParam stageParam = readFile(zis, StageParam.class);
				stageParamService.updateOrCreateStageParam(stageParam);
			} else if (name.matches(RESPONSE_FILE_PARAM_REGEX)) {
				var dir = FilenameUtils.getPath(name);
				responseFileParams.put(dir, readFile(zis, ResponseFileParam.class));
				addResponseFileParam(dir, responseFileParams, responseFileTemplates, responseFileModels);
			} else if (name.matches(RESPONSE_FILE_TEMPLATE_REGEX)) {
				var dir = FilenameUtils.getPath(name);
				responseFileTemplates.put(dir, readFile(zis));
				addResponseFileParam(dir, responseFileParams, responseFileTemplates, responseFileModels);
			} else if (name.matches(RESPONSE_FILE_MODEL_REGEX)) {
				var dir = FilenameUtils.getPath(name);
				responseFileModels.put(dir, makeResponseFileModel(name, zis));
				addResponseFileParam(dir, responseFileParams, responseFileTemplates, responseFileModels);
			}
			zipEntry = zis.getNextEntry();
		}
		zis.closeEntry();
		zis.close();
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
			responseFileParamService.addResponseFileParam(responseFileParam, null, model);
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
