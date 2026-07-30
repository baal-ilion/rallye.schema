import base64

import cv2
import numpy as np

from form_processing.markers import detect_markers
from form_processing.processor import process_image
from form_processing.registration import align_locally


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


def test_automatically_rotates_a_sideways_photo():
    reference = _reference_form()
    sideways = cv2.rotate(reference, cv2.ROTATE_90_COUNTERCLOCKWISE)

    result = process_image(_encode(sideways), _encode(reference))
    normalized = cv2.imdecode(
        np.frombuffer(base64.b64decode(result.normalized_image_base64), dtype=np.uint8),
        cv2.IMREAD_COLOR,
    )

    assert result.detected_rotation_degrees == 90
    assert result.reference_alignment_error < 3.5
    assert result.automatic_marker_detection
    assert np.mean(cv2.absdiff(normalized, reference)) < 1.0


def test_requires_manual_review_when_markers_do_not_frame_the_reference():
    reference = _reference_form()
    unrelated = np.full_like(reference, 255)
    for point in [(120, 120), (1120, 120), (1120, 1630), (120, 1630)]:
        cv2.circle(unrelated, point, 35, (0, 0, 0), -1)
        cv2.circle(unrelated, point, 15, (255, 255, 255), -1)
    cv2.putText(unrelated, "AUTRE DOCUMENT", (350, 850), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 4)

    result = process_image(_encode(unrelated), _encode(reference))

    assert result.status == "MANUAL_REVIEW_REQUIRED"
    assert result.manual_review_required
    assert not result.automatic_marker_detection
    assert result.reference_alignment_error > 3.5


def test_keeps_the_top_page_when_another_page_protrudes_underneath():
    reference = _reference_form()
    canvas = np.full((2050, 1500, 3), 210, dtype=np.uint8)

    underlying = cv2.rotate(reference, cv2.ROTATE_90_CLOCKWISE)
    visible_underlying = underlying[:, :1350]
    canvas[
        350 : 350 + visible_underlying.shape[0],
        150 : 150 + visible_underlying.shape[1],
    ] = visible_underlying

    source_corners = np.float32(
        [[0, 0], [WIDTH - 1, 0], [WIDTH - 1, HEIGHT - 1], [0, HEIGHT - 1]]
    )
    top_corners = np.float32([[210, 170], [1280, 260], [1210, 1900], [120, 1810]])
    transformation = cv2.getPerspectiveTransform(source_corners, top_corners)
    top_page = cv2.warpPerspective(reference, transformation, (1500, 2050))
    top_mask = cv2.warpPerspective(
        np.full((HEIGHT, WIDTH), 255, dtype=np.uint8),
        transformation,
        (1500, 2050),
    )
    canvas[top_mask > 0] = top_page[top_mask > 0]
    cv2.putText(
        canvas,
        "REPONSES MANUSCRITES",
        (390, 1150),
        cv2.FONT_HERSHEY_SCRIPT_SIMPLEX,
        1.7,
        (20, 20, 20),
        5,
    )

    result = process_image(_encode(canvas), _encode(reference))

    assert result.detected_rotation_degrees == 0
    assert result.automatic_marker_detection
    assert result.status in {"READY", "READY_WITH_WARNINGS"}


def test_corrects_a_smooth_local_page_deformation():
    reference = _reference_form()
    coordinates_x, coordinates_y = np.meshgrid(
        np.arange(WIDTH, dtype=np.float32),
        np.arange(HEIGHT, dtype=np.float32),
    )
    horizontal_wave = 13 * np.sin(2 * np.pi * coordinates_y / HEIGHT)
    vertical_wave = 9 * np.sin(2 * np.pi * coordinates_x / WIDTH)
    deformed = cv2.remap(
        reference,
        coordinates_x + horizontal_wave.astype(np.float32),
        coordinates_y + vertical_wave.astype(np.float32),
        cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )

    alignment = align_locally(deformed, reference)
    before = np.mean(cv2.absdiff(deformed, reference))
    after = np.mean(cv2.absdiff(alignment.image, reference))

    assert alignment.applied
    assert alignment.anchor_count >= 8
    assert alignment.confidence > 0.35
    assert after < before * 0.82


def test_local_alignment_preserves_the_four_marker_regions():
    reference = _reference_form()
    coordinates_x, coordinates_y = np.meshgrid(
        np.arange(WIDTH, dtype=np.float32),
        np.arange(HEIGHT, dtype=np.float32),
    )
    deformed = cv2.remap(
        reference,
        coordinates_x + 11 * np.sin(2 * np.pi * coordinates_y / HEIGHT),
        coordinates_y + 8 * np.sin(2 * np.pi * coordinates_x / WIDTH),
        cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )

    alignment = align_locally(deformed, reference)
    margin_x = round(WIDTH * 0.18)
    margin_y = round(HEIGHT * 0.18)

    assert np.array_equal(alignment.image[:margin_y, :], deformed[:margin_y, :])
    assert np.array_equal(alignment.image[-margin_y:, :], deformed[-margin_y:, :])
    assert np.array_equal(alignment.image[:, :margin_x], deformed[:, :margin_x])
    assert np.array_equal(alignment.image[:, -margin_x:], deformed[:, -margin_x:])
