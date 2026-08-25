from xml.etree import ElementTree

import cv2
import numpy as np

from .models import CorrectionResult, IdentificationResult


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
    for name in ("TeamTens", "TeamUnits", "Challenge", "ChallengeTens", "ChallengeUnits", "Page"):
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
        team=combined("Team", "TeamTens", "TeamUnits"),
        challenge=combined("Challenge", "ChallengeTens", "ChallengeUnits"),
        page=combined("Page", "Page", "Page"),
        confidence=min(confidences) if confidences else 0.0,
    )


def recognize_corrections(image: np.ndarray, template_xml: str | None) -> list[CorrectionResult]:
    if not template_xml:
        return []
    root = ElementTree.fromstring(template_xml)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    pixel_threshold = int(root.attrib.get("threshold", "127"))
    density_threshold = float(root.attrib.get("density", "40")) / 100.0
    marker_size = 15
    half_size = marker_size // 2
    identification_names = {"Team", "TeamTens", "TeamUnits", "Challenge", "ChallengeTens", "ChallengeUnits", "Page"}
    results: list[CorrectionResult] = []
    for question in root.findall(".//question"):
        label = question.attrib.get("question", "")
        if not label or label in identification_names:
            continue
        readings: list[tuple[str, float]] = []
        for value in question.findall("./values/value"):
            response = value.attrib.get("response", "")
            if response not in {"O", "N", "Y"}:
                continue
            point = value.find("point")
            if point is None:
                continue
            x, y = round(float(point.attrib["x"])), round(float(point.attrib["y"]))
            patch = gray[
                max(0, y-half_size):y+half_size+1,
                max(0, x-half_size):x+half_size+1,
            ]
            readings.append((
                response,
                float(np.mean(patch < pixel_threshold)) if patch.size else 0.0,
            ))
        if not readings:
            continue
        marked = [response for response, darkness in readings if darkness >= density_threshold]
        value = True if "O" in marked else False if "N" in marked else "Y" in marked
        threshold_distances = [abs(darkness - density_threshold) for _, darkness in readings]
        confidence = float(np.clip(min(threshold_distances) / max(density_threshold, 0.01), 0, 1))
        results.append(CorrectionResult(
            label=label,
            marked_values=marked,
            value=value,
            confidence=confidence,
        ))
    return results
