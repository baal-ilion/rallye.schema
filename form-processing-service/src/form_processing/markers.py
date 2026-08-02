from dataclasses import dataclass
from itertools import combinations
from math import pi

import cv2
import numpy as np

from .errors import ProcessingError


@dataclass(frozen=True)
class MarkerCandidate:
    x: float
    y: float
    radius: float
    score: float


@dataclass(frozen=True)
class DetectedMarkers:
    points: np.ndarray
    confidence: float


def _contour_candidates(binary: np.ndarray, width: int, height: int) -> list[MarkerCandidate]:
    min_dimension = min(width, height)
    contours, hierarchy = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None:
        return []

    minimum_area = (min_dimension * 0.008) ** 2 * pi
    maximum_area = (min_dimension * 0.09) ** 2 * pi
    candidates: list[MarkerCandidate] = []

    for index, contour in enumerate(contours):
        area = cv2.contourArea(contour)
        if not minimum_area <= area <= maximum_area:
            continue
        perimeter = cv2.arcLength(contour, True)
        if perimeter <= 0:
            continue
        circularity = 4 * pi * area / (perimeter * perimeter)
        if circularity < 0.52:
            continue

        child_index = hierarchy[0][index][2]
        if child_index < 0:
            continue
        child = contours[child_index]
        child_area = cv2.contourArea(child)
        if child_area <= 0:
            continue
        hole_ratio = child_area / area
        if not 0.10 <= hole_ratio <= 0.78:
            continue

        (x, y), radius = cv2.minEnclosingCircle(contour)
        margin_x = min(x, width - x) / width
        margin_y = min(y, height - y) / height
        border_likelihood = 1 - min(1.0, min(margin_x, margin_y) / 0.35)
        expected_radius = min_dimension * 0.031
        size_likelihood = max(0.0, 1 - abs(radius - expected_radius) / expected_radius)
        score = (
            0.42 * min(1.0, circularity)
            + 0.20 * (1 - abs(hole_ratio - 0.35))
            + 0.18 * border_likelihood
            + 0.20 * size_likelihood
        )
        candidates.append(MarkerCandidate(x, y, radius, score))

    return candidates


def _candidate_markers(gray: np.ndarray) -> list[MarkerCandidate]:
    height, width = gray.shape
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    adaptive = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        51,
        9,
    )
    _, otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    merged: list[MarkerCandidate] = []
    for candidate in _contour_candidates(adaptive, width, height) + _contour_candidates(otsu, width, height):
        duplicate_index = next(
            (
                index
                for index, existing in enumerate(merged)
                if np.hypot(existing.x - candidate.x, existing.y - candidate.y)
                < 0.45 * max(existing.radius, candidate.radius)
            ),
            None,
        )
        if duplicate_index is None:
            merged.append(candidate)
        elif candidate.score > merged[duplicate_index].score:
            merged[duplicate_index] = candidate

    # A damaged or annotated ring can lose its contour hierarchy. Hough then
    # provides complementary candidates. It must also run when four corner
    # regions appear occupied: a checkbox can otherwise impersonate a damaged
    # ring and prevent the real marker from ever reaching the geometry check.
    # The page geometry below remains responsible for rejecting unrelated
    # circles.
    min_dimension = min(width, height)
    scale = min(1.0, 1200.0 / max(width, height))
    reduced = cv2.resize(blurred, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    hough = cv2.HoughCircles(
        reduced,
        cv2.HOUGH_GRADIENT,
        dp=1.25,
        minDist=max(20, int(min_dimension * scale * 0.07)),
        param1=120,
        param2=32,
        minRadius=max(4, int(min_dimension * scale * 0.018)),
        maxRadius=max(8, int(min_dimension * scale * 0.050)),
    )
    if hough is not None:
        expected_radius = min_dimension * 0.031
        for reduced_x, reduced_y, reduced_radius in hough[0]:
            x, y, radius = reduced_x / scale, reduced_y / scale, reduced_radius / scale
            size_likelihood = max(0.0, 1 - abs(radius - expected_radius) / expected_radius)
            margin_x = min(x, width - x) / width
            margin_y = min(y, height - y) / height
            border_likelihood = 1 - min(1.0, min(margin_x, margin_y) / 0.35)
            fallback = MarkerCandidate(
                float(x),
                float(y),
                float(radius),
                0.34 + 0.22 * size_likelihood + 0.14 * border_likelihood,
            )
            duplicate_index = next(
                (
                    index
                    for index, existing in enumerate(merged)
                    if np.hypot(existing.x - fallback.x, existing.y - fallback.y)
                    < 0.45 * max(existing.radius, fallback.radius)
                ),
                None,
            )
            if duplicate_index is None:
                merged.append(fallback)

    merged.sort(key=lambda candidate: candidate.score, reverse=True)
    return merged[:30]


def _order_points(points: np.ndarray) -> np.ndarray:
    ordered = np.zeros((4, 2), dtype=np.float32)
    point_sum = points.sum(axis=1)
    point_difference = np.diff(points, axis=1).reshape(-1)
    ordered[0] = points[np.argmin(point_sum)]
    ordered[2] = points[np.argmax(point_sum)]
    ordered[1] = points[np.argmin(point_difference)]
    ordered[3] = points[np.argmax(point_difference)]
    return ordered


def _quad_score(points: np.ndarray, width: int, height: int, candidate_score: float) -> float:
    ordered = _order_points(points)
    if len(np.unique(ordered, axis=0)) != 4:
        return -1

    # Page markers must live in their respective corner regions. Without this
    # guard, a correction box or a digit in the header can occasionally form
    # a plausible but dangerous quadrilateral.
    normalized = ordered / np.array([width, height], dtype=np.float32)
    corner_limits = (
        normalized[0, 0] < 0.38 and normalized[0, 1] < 0.28
        and normalized[1, 0] > 0.62 and normalized[1, 1] < 0.28
        and normalized[2, 0] > 0.62 and normalized[2, 1] > 0.72
        and normalized[3, 0] < 0.38 and normalized[3, 1] > 0.72
    )
    if not corner_limits:
        return -1
    area = abs(cv2.contourArea(ordered))
    area_ratio = area / (width * height)
    if area_ratio < 0.35:
        return -1

    top, right, bottom, left = (
        np.linalg.norm(ordered[1] - ordered[0]),
        np.linalg.norm(ordered[2] - ordered[1]),
        np.linalg.norm(ordered[2] - ordered[3]),
        np.linalg.norm(ordered[3] - ordered[0]),
    )
    if min(top, right, bottom, left) <= 0:
        return -1
    opposite_similarity = min(top, bottom) / max(top, bottom)
    opposite_similarity += min(left, right) / max(left, right)

    expected = np.array(
        [[0.12 * width, 0.08 * height], [0.88 * width, 0.08 * height],
         [0.88 * width, 0.92 * height], [0.12 * width, 0.92 * height]],
        dtype=np.float32,
    )
    normalized_distance = np.mean(np.linalg.norm(ordered - expected, axis=1)) / np.hypot(width, height)
    return 2.2 * area_ratio + 0.45 * opposite_similarity + 0.25 * candidate_score - 0.8 * normalized_distance


def detect_markers(image: np.ndarray) -> DetectedMarkers:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    candidates = _candidate_markers(gray)
    if len(candidates) < 4:
        raise ProcessingError(
            "MARKERS_NOT_FOUND",
            f"Quatre repères sont nécessaires ; {len(candidates)} candidat(s) seulement ont été détectés.",
        )

    height, width = gray.shape
    best_points = None
    best_score = -1.0
    for group in combinations(candidates, 4):
        points = np.array([[candidate.x, candidate.y] for candidate in group], dtype=np.float32)
        score = _quad_score(points, width, height, sum(candidate.score for candidate in group) / 4)
        if score > best_score:
            best_score = score
            best_points = _order_points(points)

    if best_points is None:
        raise ProcessingError(
            "MARKER_GEOMETRY_INVALID",
            "Des formes ressemblant aux repères ont été trouvées, mais aucune combinaison ne délimite correctement la page.",
        )

    confidence = float(np.clip((best_score - 1.0) / 2.0, 0.0, 1.0))
    return DetectedMarkers(best_points, confidence)
