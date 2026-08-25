package fr.vandriessche.rallyeschema.coreservice.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import fr.vandriessche.rallyeschema.coreservice.entities.Corners;
import fr.vandriessche.rallyeschema.coreservice.entities.FieldType;

class FormTemplateXmlParserTests {

	@Test
	void parsesCornersGroupsQuestionsAndValues() throws Exception {
		String xml = "<template density=\"40\" threshold=\"127\" version=\"2.1\">"
				+ "<crop top=\"1\" left=\"2\" right=\"3\" bottom=\"4\"/>"
				+ "<rotation angle=\"0.5\"/><corners type=\"ROUND\">"
				+ "<corner position=\"TOP_LEFT\"><point x=\"10\" y=\"20\"/></corner>"
				+ "<corner position=\"TOP_RIGHT\"><point x=\"90\" y=\"20\"/></corner>"
				+ "<corner position=\"BOTTOM_RIGHT\"><point x=\"90\" y=\"180\"/></corner>"
				+ "<corner position=\"BOTTOM_LEFT\"><point x=\"10\" y=\"180\"/></corner></corners>"
				+ "<fields groups=\"true\" shape=\"SQUARE\" size=\"15\"><group name=\"Questions\">"
				+ "<question question=\"Question 01\" type=\"QUESTIONS_BY_ROWS\" multiple=\"true\" rejectMultiple=\"false\">"
				+ "<values><value response=\"O\"><point x=\"50\" y=\"60\"/></value>"
				+ "<value response=\"Y\"><point x=\"70\" y=\"60\"/></value></values>"
				+ "</question></group></fields></template>";

		var template = new FormTemplateXmlParser().parse(xml);

		assertEquals("2.1", template.getVersion());
		assertEquals(40, template.getDensity());
		assertEquals(10, template.getCorners().get(Corners.TOP_LEFT).getX());
		assertEquals(4, template.getCrop().get("BOTTOM"));
		assertTrue(template.isGroupsEnabled());
		var question = template.getGroups().get("Questions").getFields().get("Question 01");
		assertEquals(FieldType.QUESTIONS_BY_ROWS, question.getType());
		assertEquals(2, question.getPoints().size());
		assertEquals(2, template.getPoints().size());
	}
}
