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
    source = np.asarray(
        [[0, 0], [WIDTH - 1, 0], [WIDTH - 1, HEIGHT - 1], [0, HEIGHT - 1]],
        dtype=np.float32,
    )
    destination = np.asarray(
        [[130, 90], [1120, 20], [1210, 1700], [45, 1610]],
        dtype=np.float32,
    )
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


def test_detects_form_with_large_margin_below_in_portrait_photo():
    reference = _reference_form()
    photo = np.full((2500, WIDTH, 3), 220, dtype=np.uint8)
    photo[100:100 + HEIGHT, :] = reference

    detection = detect_markers(photo)

    assert detection.points.shape == (4, 2)
    assert detection.points[2][1] / photo.shape[0] < 0.72


def test_ignores_a_marker_from_a_second_sheet_visible_below_the_form():
    reference = _reference_form()
    photo = np.full((2250, WIDTH, 3), 220, dtype=np.uint8)
    photo[60:60 + HEIGHT, :] = reference

    # A partly visible sheet underneath contributes a plausible fifth ring.
    # It is deliberately a little damaged, as it would be along an overlap.
    foreign_marker = (round(WIDTH * 0.88), 2110)
    cv2.circle(photo, foreign_marker, 25, (0, 0, 0), -1)
    cv2.circle(photo, foreign_marker, 10, (255, 255, 255), -1)

    detection = detect_markers(photo)

    expected_bottom_right_y = 60 + round(HEIGHT * 0.92)
    assert abs(float(detection.points[2][1]) - expected_bottom_right_y) < 25


def test_detects_smaller_form_in_upper_half_of_phone_photo():
    reference = _reference_form()
    scale = 0.68
    reduced = cv2.resize(reference, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    photo = np.full((2400, 1200, 3), 210, dtype=np.uint8)
    top, left = 220, 175
    height, width = reduced.shape[:2]
    photo[top:top + height, left:left + width] = reduced

    detection = detect_markers(photo)

    marker_area = abs(cv2.contourArea(detection.points)) / (photo.shape[0] * photo.shape[1])
    assert detection.points.shape == (4, 2)
    assert 0.20 < marker_area < 0.35


def test_detects_form_regardless_of_its_occupancy_in_photo():
    reference = _reference_form()
    scale = 0.42
    reduced = cv2.resize(reference, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    photo = np.full((2600, 1800, 3), 205, dtype=np.uint8)
    top, left = 360, 620
    height, width = reduced.shape[:2]
    photo[top:top + height, left:left + width] = reduced

    detection = detect_markers(photo)

    marker_area = abs(cv2.contourArea(detection.points)) / (photo.shape[0] * photo.shape[1])
    assert detection.points.shape == (4, 2)
    assert marker_area < 0.15


def test_normalizes_a_perspective_photo_against_reference():
    reference = _reference_form()
    photo = _damaged_perspective_photo(reference)
    result = process_image(_encode(photo), _encode(reference))

    assert result.normalized_width == WIDTH
    assert result.normalized_height == HEIGHT
    assert result.status in {"READY", "READY_WITH_WARNINGS"}
    assert result.normalized_image_base64 is not None
    normalized = cv2.imdecode(
        np.frombuffer(base64.b64decode(result.normalized_image_base64), dtype=np.uint8),
        cv2.IMREAD_COLOR,
    )
    assert normalized is not None
    assert normalized.shape[:2] == (HEIGHT, WIDTH)


def test_does_not_require_review_when_global_reference_alignment_is_precise():
    reference = _reference_form()
    photo = np.full((2500, WIDTH, 3), 220, dtype=np.uint8)
    photo[100:100 + HEIGHT, :] = reference

    result = process_image(_encode(photo), _encode(reference))

    assert result.automatic_marker_detection
    assert result.reference_alignment_error <= 3.0
    assert not result.manual_review_required
    assert result.status == "READY"


def test_can_reserve_local_alignment_for_the_exact_page_model():
    reference = _reference_form()
    photo = _damaged_perspective_photo(reference)

    result = process_image(
        _encode(photo),
        _encode(reference),
        apply_local_alignment=False,
    )

    assert result.automatic_marker_detection
    assert result.local_alignment_applied is False
    assert result.local_alignment_anchor_count == 0
    assert not any("recalage local" in warning for warning in result.warnings)


def test_automatically_rotates_a_sideways_photo():
    reference = _reference_form()
    sideways = cv2.rotate(reference, cv2.ROTATE_90_COUNTERCLOCKWISE)

    result = process_image(_encode(sideways), _encode(reference))
    assert result.normalized_image_base64 is not None
    normalized = cv2.imdecode(
        np.frombuffer(base64.b64decode(result.normalized_image_base64), dtype=np.uint8),
        cv2.IMREAD_COLOR,
    )

    assert normalized is not None
    assert result.detected_rotation_degrees == 90
    assert result.reference_alignment_error < 3.5
    assert result.automatic_marker_detection
    assert np.mean(cv2.absdiff(normalized, reference)) < 1.0


def test_keeps_upright_dense_form_with_a_sparse_reference():
    reference = _reference_form()
    # Le formulaire d'initialisation utilisé pour l'identification est bien
    # plus vide que les formulaires réels. La profusion de traits et d'écriture
    # ne doit pas rendre une orientation couchée artificiellement meilleure.
    dense_form = reference.copy()
    for x in range(285, 970, 45):
        cv2.line(dense_form, (x, 320), (x, 1430), (0, 0, 0), 2)
    for y in range(350, 1400, 55):
        cv2.putText(
            dense_form,
            f"REPONSE {y}",
            (300, y),
            cv2.FONT_HERSHEY_SCRIPT_SIMPLEX,
            0.7,
            (0, 0, 0),
            2,
        )

    result = process_image(_encode(dense_form), _encode(reference))

    assert result.detected_rotation_degrees == 0
    assert result.automatic_marker_detection


def test_reads_identification_boxes_from_the_active_template():
    reference = _reference_form()
    cv2.rectangle(reference, (365, 275), (405, 315), (0, 0, 0), -1)
    cv2.rectangle(reference, (455, 365), (495, 405), (0, 0, 0), -1)
    template = """<template><fields><group>
      <question question="TeamTens"><values>
        <value response="2"><point x="385" y="295"/></value>
        <value response="8"><point x="475" y="295"/></value>
      </values></question>
      <question question="TeamUnits"><values>
        <value response="3"><point x="475" y="385"/></value>
        <value response="9"><point x="565" y="385"/></value>
      </values></question>
    </group></fields></template>"""

    result = process_image(_encode(reference), _encode(reference), template_xml=template)

    assert result.identification is not None
    assert result.identification.team == 23
    assert result.identification.confidence > 0.5


def test_reads_identification_when_reference_image_and_xml_use_different_corner_coordinates():
    reference = _reference_form()
    source_markers = detect_markers(reference).points.astype(np.float32)
    declared_markers = np.asarray(
        [[210, 180], [1030, 180], [1030, 1574], [210, 1574]],
        dtype=np.float32,
    )
    transformation = cv2.getPerspectiveTransform(source_markers, declared_markers)

    source_positions = np.asarray([[[365, 295], [475, 385]]], dtype=np.float32)
    declared_positions = cv2.perspectiveTransform(source_positions, transformation)[0]
    cv2.rectangle(reference, (345, 275), (385, 315), (0, 0, 0), -1)
    cv2.rectangle(reference, (455, 365), (495, 405), (0, 0, 0), -1)

    corners = "".join(
        f'<corner position="{name}"><point x="{point[0]}" y="{point[1]}"/></corner>'
        for name, point in zip(
            ("TOP_LEFT", "TOP_RIGHT", "BOTTOM_RIGHT", "BOTTOM_LEFT"),
            declared_markers,
        )
    )
    template = f"""<template><corners>{corners}</corners><fields><group>
      <question question="TeamTens"><values>
        <value response="2"><point x="{declared_positions[0][0]}" y="{declared_positions[0][1]}"/></value>
        <value response="8"><point x="{declared_positions[0][0] + 80}" y="{declared_positions[0][1]}"/></value>
      </values></question>
      <question question="TeamUnits"><values>
        <value response="3"><point x="{declared_positions[1][0]}" y="{declared_positions[1][1]}"/></value>
        <value response="9"><point x="{declared_positions[1][0] + 80}" y="{declared_positions[1][1]}"/></value>
      </values></question>
    </group></fields></template>"""

    result = process_image(_encode(reference), _encode(reference), template_xml=template)

    assert result.identification is not None
    assert result.identification.team == 23
    assert np.allclose(
        [result.target_markers.top_left.x, result.target_markers.top_left.y],
        declared_markers[0],
    )


def test_reads_correction_boxes_with_the_ony_priority_rule():
    reference = _reference_form()
    positions = {
        "FAUX": {"O": (340, 520), "N": (380, 520), "Y": (420, 520)},
        "JUSTE": {"O": (340, 610), "N": (380, 610), "Y": (420, 610)},
        "CORRIGE_FAUX": {"O": (340, 700), "N": (380, 700), "Y": (420, 700)},
        "CORRIGE_JUSTE": {"O": (340, 790), "N": (380, 790), "Y": (420, 790)},
    }
    for label, marked_values in {
        "FAUX": (),
        "JUSTE": ("Y",),
        "CORRIGE_FAUX": ("Y", "N"),
        "CORRIGE_JUSTE": ("Y", "N", "O"),
    }.items():
        for response in marked_values:
            cv2.rectangle(
                reference,
                (positions[label][response][0] - 12, positions[label][response][1] - 12),
                (positions[label][response][0] + 12, positions[label][response][1] + 12),
                (0, 0, 0),
                -1,
            )

    questions = []
    for label, values in positions.items():
        xml_values = "".join(
            f'<value response="{response}"><point x="{point[0]}" y="{point[1]}"/></value>'
            for response, point in values.items()
        )
        questions.append(f'<question question="{label}"><values>{xml_values}</values></question>')
    template = f"<template><fields><group>{''.join(questions)}</group></fields></template>"

    result = process_image(_encode(reference), _encode(reference), template_xml=template)
    corrections = {correction.label: correction for correction in result.corrections}

    assert corrections["FAUX"].value is False
    assert corrections["FAUX"].marked_values == []
    assert corrections["JUSTE"].value is True
    assert corrections["JUSTE"].marked_values == ["Y"]
    assert corrections["CORRIGE_FAUX"].value is False
    assert corrections["CORRIGE_FAUX"].marked_values == ["N", "Y"]
    assert corrections["CORRIGE_JUSTE"].value is True
    assert corrections["CORRIGE_JUSTE"].marked_values == ["O", "N", "Y"]


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

    source_corners = np.asarray(
        [[0, 0], [WIDTH - 1, 0], [WIDTH - 1, HEIGHT - 1], [0, HEIGHT - 1]],
        dtype=np.float32,
    )
    top_corners = np.asarray(
        [[210, 170], [1280, 260], [1210, 1900], [120, 1810]],
        dtype=np.float32,
    )
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
    radius = round(min(WIDTH, HEIGHT) * 0.04)
    for center_x, center_y in (
        (round(WIDTH * 0.12), round(HEIGHT * 0.08)),
        (round(WIDTH * 0.88), round(HEIGHT * 0.08)),
        (round(WIDTH * 0.88), round(HEIGHT * 0.92)),
        (round(WIDTH * 0.12), round(HEIGHT * 0.92)),
    ):
        expected = deformed[center_y-radius:center_y+radius, center_x-radius:center_x+radius]
        actual = alignment.image[center_y-radius:center_y+radius, center_x-radius:center_x+radius]
        assert np.array_equal(actual, expected)
