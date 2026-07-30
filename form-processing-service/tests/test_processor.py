import base64

import cv2
import numpy as np

from form_processing.markers import detect_markers
from form_processing.processor import process_image


WIDTH = 1240
HEIGHT = 1754


def _reference_form() -> np.ndarray:
    image = np.full((HEIGHT, WIDTH, 3), 255, dtype=np.uint8)
    marker_points = [
        (round(WIDTH * 0.12), round(HEIGHT * 0.08)),
        (round(WIDTH * 0.88), round(HEIGHT * 0.08)),
        (round(WIDTH * 0.88), round(HEIGHT * 0.92)),
        (round(WIDTH * 0.12), round(HEIGHT * 0.92)),
    ]
    for point in marker_points:
        cv2.circle(image, point, 35, (0, 0, 0), -1)
        cv2.circle(image, point, 15, (255, 255, 255), -1)

    cv2.rectangle(image, (250, 260), (990, 1450), (0, 0, 0), 3)
    for y in range(330, 1400, 90):
        cv2.line(image, (250, y), (990, y), (0, 0, 0), 2)
    cv2.putText(image, "FORMULAIRE TEST", (350, 210), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)
    return image


def _encode(image: np.ndarray) -> bytes:
    ok, encoded = cv2.imencode(".png", image)
    assert ok
    return encoded.tobytes()


def _damaged_perspective_photo(reference: np.ndarray) -> np.ndarray:
    source = np.float32([[0, 0], [WIDTH - 1, 0], [WIDTH - 1, HEIGHT - 1], [0, HEIGHT - 1]])
    destination = np.float32([[130, 90], [1120, 20], [1210, 1700], [45, 1610]])
    matrix = cv2.getPerspectiveTransform(source, destination)
    photo = cv2.warpPerspective(reference, matrix, (1280, 1800), borderValue=(190, 180, 165))

    # Annotations parasites volontaires, hors des repères et dans le formulaire.
    cv2.putText(photo, "URGENT!", (420, 1000), cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, 2.2, (20, 20, 20), 5)
    cv2.line(photo, (300, 600), (1050, 1250), (15, 15, 15), 4)
    return photo


def test_detects_four_ring_markers_despite_annotations():
    photo = _damaged_perspective_photo(_reference_form())
    detection = detect_markers(photo)
    assert detection.points.shape == (4, 2)
    assert detection.confidence > 0.45


def test_normalizes_a_perspective_photo_against_reference():
    reference = _reference_form()
    photo = _damaged_perspective_photo(reference)
    result = process_image(_encode(photo), _encode(reference))

    assert result.normalized_width == WIDTH
    assert result.normalized_height == HEIGHT
    assert result.status in {"READY", "READY_WITH_WARNINGS"}
    normalized = cv2.imdecode(
        np.frombuffer(base64.b64decode(result.normalized_image_base64), dtype=np.uint8),
        cv2.IMREAD_COLOR,
    )
    assert normalized.shape[:2] == (HEIGHT, WIDTH)

