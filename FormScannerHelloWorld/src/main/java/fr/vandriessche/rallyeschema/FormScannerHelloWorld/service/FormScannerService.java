package fr.vandriessche.rallyeschema.FormScannerHelloWorld.service;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.concurrent.Callable;

import javax.imageio.ImageIO;
import javax.xml.parsers.ParserConfigurationException;

import org.apache.commons.io.FilenameUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.xml.sax.SAXException;

import com.albertoborsetta.formscanner.api.FormArea;
import com.albertoborsetta.formscanner.api.FormGroup;
import com.albertoborsetta.formscanner.api.FormQuestion;
import com.albertoborsetta.formscanner.api.FormTemplate;
import com.albertoborsetta.formscanner.api.commons.Constants.CornerType;
import com.albertoborsetta.formscanner.api.commons.Constants.ShapeType;
import com.albertoborsetta.formscanner.api.exceptions.FormScannerException;

import lombok.extern.java.Log;

@Service
@Log
public class FormScannerService {
	@Value("${TemplateFileName:unknown}")
	private String templateFileName;
	@Value("${ImageFileName:unknown}")
	private String imageFileName;

	public void analyze() {
		log.info(imageFileName);
		log.info(templateFileName);
		Callable<FormTemplate> computeForm;
		try {
			File imageFile = new File(imageFileName);
			File templateFile = new File(templateFileName);
			FormTemplate formTemplate = new FormTemplate(templateFile);

			Integer threshold = formTemplate.getThreshold() < 0 ? 127 : formTemplate.getThreshold();
			Integer density = formTemplate.getDensity() < 0 ? 40 : formTemplate.getDensity();
			Integer shapeSize = formTemplate.getSize() < 0 ? 15 : formTemplate.getSize();
			ShapeType shapeType = formTemplate.getShape() == null ? ShapeType.SQUARE : formTemplate.getShape();
			CornerType cornerType = formTemplate.getCornerType() == null ? CornerType.ROUND
					: formTemplate.getCornerType();
			HashMap<String, Integer> crop = formTemplate.getCrop() == null ? new HashMap<String, Integer>()
					: formTemplate.getCrop();
			boolean groupsEnabled = formTemplate.isGroupsEnabled();

			BufferedImage image = ImageIO.read(imageFile);
			String name = FilenameUtils.removeExtension(imageFile.getName());
			FormTemplate filledForm = new FormTemplate(name, formTemplate);
			filledForm.findCorners(image, threshold, density, cornerType, crop);
			filledForm.findPoints(image, threshold, density, shapeSize);
			filledForm.findAreas(image);

			HashMap<String, FormGroup> groups = filledForm.getGroups();

			log.info(filledForm.getName());

			for (String groupKey : groups.keySet()) {
				FormGroup group = groups.get(groupKey);
				log.info(groupKey);

				for (FormQuestion field : group.getFields().values()) {
					log.info(field.getName() + " : " + field.getValues());
				}

				for (FormArea area : group.getAreas().values()) {
					log.info(area.getName() + " : " + area.getText());
				}
			}

		} catch (IOException e) {
			e.printStackTrace();
		} catch (ParserConfigurationException e) {
			// TODO Bloc catch généré automatiquement
			e.printStackTrace();
		} catch (SAXException e) {
			// TODO Bloc catch généré automatiquement
			e.printStackTrace();
		} catch (FormScannerException e) {
			// TODO Bloc catch généré automatiquement
			e.printStackTrace();
		}
	}
}
