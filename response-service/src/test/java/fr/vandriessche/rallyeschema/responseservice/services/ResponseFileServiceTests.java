package fr.vandriessche.rallyeschema.responseservice.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;

import org.junit.jupiter.api.Test;

import fr.vandriessche.rallyeschema.responseservice.entities.FormGroup;
import fr.vandriessche.rallyeschema.responseservice.entities.FormPoint;
import fr.vandriessche.rallyeschema.responseservice.entities.FormQuestion;
import fr.vandriessche.rallyeschema.responseservice.entities.FormTemplate;
import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;

class ResponseFileServiceTests {

	@Test
	void makesModernCorrectionMarksAuthoritativeWithoutLosingTheirCoordinates() {
		ResponseFileService service = new ResponseFileService();
		ResponseFileInfo info = new ResponseFileInfo();
		FormTemplate filled = formWithQuestion("Question 01", "N", new FormPoint(20, 30));
		FormTemplate template = formWithQuestion("Question 01", "Y", new FormPoint(100, 200));
		filled.setParentTemplate(template);
		info.setFilledForm(filled);

		FormProcessingClient.Correction correction = new FormProcessingClient.Correction();
		correction.setLabel("Question 01");
		correction.setMarkedValues(Arrays.asList("Y"));
		correction.setValue(true);
		correction.setConfidence(0.92);

		service.applyProcessingCorrections(info, Arrays.asList(correction));

		FormQuestion question = filled.getGroups().get("Questions").getFields().get("Question 01");
		assertEquals(1, question.getPoints().size());
		assertTrue(question.getPoints().containsKey("Y"));
		assertEquals(new FormPoint(100, 200), question.getPoints().get("Y"));
		assertTrue(info.getProcessingCorrectionValues().get("Question 01"));
		assertEquals(0.92, info.getProcessingCorrectionConfidences().get("Question 01"), 0.001);
		assertTrue(info.getProcessingCorrectionDifferences().contains("Question 01"));
	}

	@Test
	void clearsLegacyMarksWhenTheModernServiceDetectsNoMark() {
		ResponseFileService service = new ResponseFileService();
		ResponseFileInfo info = new ResponseFileInfo();
		FormTemplate filled = formWithQuestion("Question 01", "Y", new FormPoint(100, 200));
		filled.setParentTemplate(formWithQuestion("Question 01", "Y", new FormPoint(100, 200)));
		info.setFilledForm(filled);

		FormProcessingClient.Correction correction = new FormProcessingClient.Correction();
		correction.setLabel("Question 01");
		correction.setMarkedValues(Arrays.asList());
		correction.setValue(false);

		service.applyProcessingCorrections(info, Arrays.asList(correction));

		assertTrue(filled.getGroups().get("Questions").getFields().get("Question 01").getPoints().isEmpty());
		assertFalse(info.getProcessingCorrectionValues().get("Question 01"));
	}

	private FormTemplate formWithQuestion(String label, String mark, FormPoint point) {
		FormQuestion question = new FormQuestion();
		question.setName(label);
		question.getPoints().put(mark, point);
		FormGroup group = new FormGroup();
		group.getFields().put(label, question);
		FormTemplate form = new FormTemplate();
		form.getGroups().put("Questions", group);
		return form;
	}
}
