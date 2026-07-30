from xml.etree import ElementTree

import cv2
import numpy as np

from .models import IdentificationResult


def _read_field(image: np.ndarray, question: ElementTree.Element) -> tuple[str | None, float]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    candidates: list[tuple[float, str]] = []
    for value in question.findall("./values/value"):
        point = value.find("point")
        if point is None:
            continue
        x, y = round(float(point.attrib["x"])), round(float(point.attrib["y"]))
        radius = max(7, round(min(image.shape[:2]) * 0.0045))
        patch = gray[max(0, y-radius):y+radius+1, max(0, x-radius):x+radius+1]
        darkness = float(np.mean(patch < 105)) if patch.size else 0.0
        candidates.append((darkness, value.attrib.get("response", "")))
    if not candidates:
        return None, 0.0
    candidates.sort(reverse=True)
    best, response = candidates[0]
    second = candidates[1][0] if len(candidates) > 1 else 0.0
    confidence = float(np.clip((best - 0.35) / 0.55, 0, 1) * np.clip((best - second) / 0.35, 0, 1))
    return (response if best >= 0.55 else None), confidence


def recognize_identification(image: np.ndarray, template_xml: str | None) -> IdentificationResult | None:
    if not template_xml:
        return None
    root = ElementTree.fromstring(template_xml)
    questions = {q.attrib.get("question"): q for q in root.findall(".//question")}
    values: dict[str, str | None] = {}
    confidences: list[float] = []
    for name in ("Equipe1", "Equipe2", "Etape", "Etape1", "Etape2", "Page"):
        if name in questions:
            values[name], confidence = _read_field(image, questions[name])
            confidences.append(confidence)

    def combined(single: str, first: str, second: str) -> int | None:
        text = values.get(single)
        if text is None:
            parts = (values.get(first), values.get(second))
            text = "".join(parts) if all(part is not None for part in parts) else None
        return int(text) if text and text.isdigit() else None

    return IdentificationResult(
        team=combined("Equipe", "Equipe1", "Equipe2"),
        stage=combined("Etape", "Etape1", "Etape2"),
        page=combined("Page", "Page", "Page"),
        confidence=min(confidences) if confidences else 0.0,
    )
