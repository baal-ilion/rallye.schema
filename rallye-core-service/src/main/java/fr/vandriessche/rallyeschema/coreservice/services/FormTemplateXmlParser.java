package fr.vandriessche.rallyeschema.coreservice.services;

import java.io.IOException;
import java.io.StringReader;
import java.util.ArrayList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import fr.vandriessche.rallyeschema.coreservice.entities.CornerType;
import fr.vandriessche.rallyeschema.coreservice.entities.Corners;
import fr.vandriessche.rallyeschema.coreservice.entities.FieldType;
import fr.vandriessche.rallyeschema.coreservice.entities.FormArea;
import fr.vandriessche.rallyeschema.coreservice.entities.FormGroup;
import fr.vandriessche.rallyeschema.coreservice.entities.FormPoint;
import fr.vandriessche.rallyeschema.coreservice.entities.FormQuestion;
import fr.vandriessche.rallyeschema.coreservice.entities.FormTemplate;
import fr.vandriessche.rallyeschema.coreservice.entities.ShapeType;

/** Lit le format XTmpl utilisé pour décrire les formulaires. */
public class FormTemplateXmlParser {

	public FormTemplate parse(String xml) throws ParserConfigurationException, SAXException, IOException {
		FormTemplate template = new FormTemplate();
		if (xml == null || xml.isBlank())
			return template;
		DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
		factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
		factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
		factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
		factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
		factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
		Element root = factory.newDocumentBuilder().parse(new InputSource(new StringReader(xml))).getDocumentElement();
		template.setVersion(attribute(root, "version", null));
		template.setDensity(integer(root, "density", -1));
		template.setThreshold(integer(root, "threshold", -1));
		Element rotation = child(root, "rotation");
		if (rotation != null)
			template.setRotation(decimal(rotation, "angle", 0));
		Element crop = child(root, "crop");
		if (crop != null)
			for (String side : new String[] { "TOP", "LEFT", "RIGHT", "BOTTOM" })
				template.getCrop().put(side, integer(crop, side.toLowerCase(), 0));
		Element corners = child(root, "corners");
		if (corners != null) {
			template.setCornerType(enumValue(CornerType.class, attribute(corners, "type", "ROUND")));
			for (Element corner : children(corners, "corner")) {
				Element point = child(corner, "point");
				if (point != null)
					template.getCorners().put(enumValue(Corners.class, attribute(corner, "position", null)), point(point));
			}
		}
		Element fields = child(root, "fields");
		if (fields != null) {
			template.setGroupsEnabled(Boolean.parseBoolean(attribute(fields, "groups", "false")));
			template.setShape(enumValue(ShapeType.class, attribute(fields, "shape", "SQUARE")));
			template.setSize(integer(fields, "size", -1));
			for (Element groupElement : children(fields, "group"))
				parseGroup(template, groupElement);
		}
		FormPoint topLeft = template.getCorners().get(Corners.TOP_LEFT);
		FormPoint bottomRight = template.getCorners().get(Corners.BOTTOM_RIGHT);
		if (topLeft != null && bottomRight != null) {
			double dx = bottomRight.getX() - topLeft.getX();
			double dy = bottomRight.getY() - topLeft.getY();
			template.setDiagonal(dx * dx + dy * dy);
		}
		return template;
	}

	private void parseGroup(FormTemplate template, Element source) {
		String name = attribute(source, "name", "");
		FormGroup group = new FormGroup();
		for (Element questionElement : children(source, "question")) {
			FormQuestion question = new FormQuestion();
			question.setName(attribute(questionElement, "question", ""));
			question.setType(enumValue(FieldType.class,
					attribute(questionElement, "type", "QUESTIONS_BY_ROWS")));
			question.setMultiple(Boolean.parseBoolean(attribute(questionElement, "multiple", "false")));
			question.setRejectMultiple(Boolean.parseBoolean(attribute(questionElement, "rejectMultiple", "false")));
			Element values = child(questionElement, "values");
			if (values != null)
				for (Element value : children(values, "value")) {
					Element point = child(value, "point");
					if (point != null) {
						FormPoint parsed = point(point);
						question.getPoints().put(attribute(value, "response", ""), parsed);
						template.getPoints().add(parsed);
					}
				}
			group.getFields().put(question.getName(), question);
		}
		for (Element areaElement : children(source, "area")) {
			FormArea area = new FormArea();
			area.setName(attribute(areaElement, "area", attribute(areaElement, "name", "")));
			String areaType = attribute(areaElement, "type", null);
			if (areaType != null && !areaType.isBlank())
				area.setType(enumValue(FieldType.class, areaType));
			for (Element corner : children(areaElement, "corner")) {
				Element point = child(corner, "point");
				if (point != null)
					area.getCorners().put(enumValue(Corners.class, attribute(corner, "position", null)), point(point));
			}
			group.getAreas().put(area.getName(), area);
			template.getAreas().add(area);
		}
		group.setLastFieldIndex(group.getFields().size() + group.getAreas().size() + 1);
		template.getGroups().put(name, group);
		template.getUsedGroupNames().add(name);
	}

	private FormPoint point(Element element) {
		return new FormPoint(decimal(element, "x", 0), decimal(element, "y", 0));
	}

	private Element child(Element parent, String name) {
		for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling())
			if (node instanceof Element && name.equals(node.getNodeName()))
				return (Element) node;
		return null;
	}

	private Iterable<Element> children(Element parent, String name) {
		ArrayList<Element> result = new ArrayList<>();
		NodeList nodes = parent.getChildNodes();
		for (int i = 0; i < nodes.getLength(); i++)
			if (nodes.item(i) instanceof Element && name.equals(nodes.item(i).getNodeName()))
				result.add((Element) nodes.item(i));
		return result;
	}

	private String attribute(Element element, String name, String fallback) {
		return element.hasAttribute(name) ? element.getAttribute(name) : fallback;
	}

	private int integer(Element element, String name, int fallback) {
		String value = attribute(element, name, null);
		return value == null || value.isBlank() ? fallback : Integer.parseInt(value);
	}

	private double decimal(Element element, String name, double fallback) {
		String value = attribute(element, name, null);
		return value == null || value.isBlank() ? fallback : Double.parseDouble(value);
	}

	private <T extends Enum<T>> T enumValue(Class<T> type, String value) {
		return value == null || value.isBlank() ? null : Enum.valueOf(type, value);
	}
}
