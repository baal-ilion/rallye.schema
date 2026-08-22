import base64
from functools import lru_cache
from xml.etree import ElementTree

import cv2
import numpy as np

from .image_io import decode_image, encode_png
from .errors import ProcessingError
from .markers import DetectedMarkers, detect_markers
from .models import MarkerSet, Point, ProcessResponse
from .quality import analyze_quality
from .registration import LocalAlignment, align_locally
from .identification import recognize_corrections, recognize_identification


DEFAULT_WIDTH = 2480
DEFAULT_HEIGHT = 3508
ORIENTATION_WORKING_HEIGHT = 700
MAXIMUM_REFERENCE_ALIGNMENT_ERROR = 12.0
MINIMUM_REFERENCE_COLUMN_CORRELATION = 0.15
TRUSTED_REFERENCE_ALIGNMENT_ERROR = 3.0
# La distance aux traits seuls est trompeuse sur une feuille très remplie :
# une orientation couchée peut rencontrer beaucoup de lignes de tableaux par
# hasard. La projection verticale conserve, elle, la position de l'en-tête et
# des cartouches et doit donc guider prioritairement le choix d'orientation.
ORIENTATION_COLUMN_CORRELATION_WEIGHT = 20.0


def _marker_model(markers: np.ndarray) -> MarkerSet:
    return MarkerSet(
        top_left=Point(x=float(markers[0][0]), y=float(markers[0][1])),
        top_right=Point(x=float(markers[1][0]), y=float(markers[1][1])),
        bottom_right=Point(x=float(markers[2][0]), y=float(markers[2][1])),
        bottom_left=Point(x=float(markers[3][0]), y=float(markers[3][1])),
    )


def _default_target(width: int, height: int) -> np.ndarray:
    return np.array(
        [
            [0.12 * width, 0.08 * height],
            [0.88 * width, 0.08 * height],
            [0.88 * width, 0.92 * height],
            [0.12 * width, 0.92 * height],
        ],
        dtype=np.float32,
    )


@lru_cache(maxsize=64)
def _decode_reference(reference_content: bytes) -> tuple[np.ndarray, np.ndarray]:
    reference = decode_image(reference_content)
    return reference, detect_markers(reference).points


def _template_markers(template_xml: str | None) -> np.ndarray | None:
    if not template_xml:
        return None
    root = ElementTree.fromstring(template_xml)
    corners: dict[str, tuple[float, float]] = {}
    for corner in root.findall("./corners/corner"):
        point = corner.find("point")
        position = corner.attrib.get("position")
        if point is not None and position:
            corners[position] = (float(point.attrib["x"]), float(point.attrib["y"]))
    order = ("TOP_LEFT", "TOP_RIGHT", "BOTTOM_RIGHT", "BOTTOM_LEFT")
    if not all(position in corners for position in order):
        return None
    return np.array([corners[position] for position in order], dtype=np.float32)


def _reference_in_template_space(
    reference: np.ndarray,
    detected_markers: np.ndarray,
    template_xml: str | None,
) -> tuple[np.ndarray, np.ndarray]:
    """Place l'image de référence dans le repère déclaré par son XML."""
    declared_markers = _template_markers(template_xml)
    if declared_markers is None:
        return reference, detected_markers.copy()
    if np.max(np.linalg.norm(detected_markers - declared_markers, axis=1)) < 0.5:
        return reference, declared_markers
    height, width = reference.shape[:2]
    transformation = cv2.getPerspectiveTransform(detected_markers, declared_markers)
    aligned_reference = cv2.warpPerspective(
        reference,
        transformation,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(255, 255, 255),
    )
    return aligned_reference, declared_markers


def _edge_map_for_orientation(image: np.ndarray) -> np.ndarray:
    scale = ORIENTATION_WORKING_HEIGHT / image.shape[0]
    width = max(1, round(image.shape[1] * scale))
    resized = cv2.resize(image, (width, ORIENTATION_WORKING_HEIGHT), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    return cv2.Canny(gray, 60, 170)


def _normalized_projection(values: np.ndarray) -> np.ndarray:
    values = values.astype(np.float32)
    return (values - values.mean()) / (values.std() + 1e-6)


def _reference_alignment_metrics(
    image: np.ndarray,
    reference_edges: np.ndarray,
) -> tuple[float, float]:
    image_edges = _edge_map_for_orientation(image)
    distances = cv2.distanceTransform(255 - image_edges, cv2.DIST_L2, 3)
    values = distances[reference_edges > 0]
    alignment_error = float(np.percentile(values, 75)) if values.size else float("inf")

    # La projection verticale décrit la structure stable de la feuille :
    # cartouches d'identification, marges, tableaux et pied de page. Elle reste
    # fiable quand les réponses sont manuscrites ou qu'une autre feuille dépasse
    # derrière la feuille photographiée.
    reference_projection = _normalized_projection(reference_edges.sum(axis=0))
    image_projection = _normalized_projection(image_edges.sum(axis=0))
    column_correlation = float(np.mean(reference_projection * image_projection))
    return alignment_error, column_correlation


def _normalize_orientation(
    source: np.ndarray,
    source_markers: np.ndarray,
    reference: np.ndarray,
    target_markers: np.ndarray,
) -> tuple[np.ndarray, int, float, float]:
    """Choisit l'orientation qui aligne le mieux l'en-tête de référence."""
    height, width = reference.shape[:2]
    reference_edges = _edge_map_for_orientation(reference)
    candidates: list[tuple[float, float, float, int, np.ndarray]] = []
    for quarter_turn in range(4):
        oriented_markers = np.roll(source_markers, quarter_turn, axis=0)
        transformation = cv2.getPerspectiveTransform(oriented_markers, target_markers)
        normalized = cv2.warpPerspective(
            source,
            transformation,
            (width, height),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255),
        )
        alignment_error, column_correlation = _reference_alignment_metrics(
            normalized,
            reference_edges,
        )
        orientation_score = (
            alignment_error
            - ORIENTATION_COLUMN_CORRELATION_WEIGHT * column_correlation
        )
        candidates.append(
            (
                orientation_score,
                alignment_error,
                column_correlation,
                quarter_turn * 90,
                normalized,
            )
        )
    _, error, correlation, rotation, image = min(
        candidates,
        key=lambda candidate: candidate[0],
    )
    return image, rotation, error, correlation


def process_image(
    image_content: bytes,
    reference_content: bytes | None = None,
    target_width: int | None = None,
    target_height: int | None = None,
    template_xml: str | None = None,
    apply_local_alignment: bool = True,
    forced_source_markers: MarkerSet | None = None,
    recognize_correction_marks: bool = True,
    include_normalized_image: bool = True,
) -> ProcessResponse:
    source = decode_image(image_content)
    source_height, source_width = source.shape[:2]
    marker_warning: str | None = None
    detected_rotation_degrees = 0
    reference_alignment_error = 0.0
    reference_column_correlation = 1.0
    source_to_normalized_transform: list[list[float]] | None = None
    if forced_source_markers is not None:
        source_detection = DetectedMarkers(
            np.array(
                [
                    [forced_source_markers.top_left.x, forced_source_markers.top_left.y],
                    [forced_source_markers.top_right.x, forced_source_markers.top_right.y],
                    [forced_source_markers.bottom_right.x, forced_source_markers.bottom_right.y],
                    [forced_source_markers.bottom_left.x, forced_source_markers.bottom_left.y],
                ],
                dtype=np.float32,
            ),
            1.0,
        )
        automatic_marker_detection = False
    else:
        try:
            source_detection = detect_markers(source)
            automatic_marker_detection = True
        except ProcessingError as error:
            if error.code not in {"MARKERS_NOT_FOUND", "MARKER_GEOMETRY_INVALID"}:
                raise
            # A failed automatic detection must never discard a rally form. The
            # verification screen can reposition these suggested corners manually.
            source_detection = DetectedMarkers(
                _default_target(source_width, source_height),
                0.0,
            )
            automatic_marker_detection = False
            marker_warning = (
                "Les quatre repères n’ont pas pu être positionnés automatiquement. "
                "Vérifiez-les manuellement avant d’accepter le formulaire."
            )

    reference = None
    if reference_content:
        decoded_reference, cached_target_markers = _decode_reference(reference_content)
        reference, target_markers = _reference_in_template_space(
            decoded_reference,
            cached_target_markers,
            template_xml,
        )
        normalized_height, normalized_width = reference.shape[:2]
    else:
        normalized_width = target_width or DEFAULT_WIDTH
        normalized_height = target_height or DEFAULT_HEIGHT
        target_markers = _default_target(normalized_width, normalized_height)

    if forced_source_markers is not None:
        transformation = cv2.getPerspectiveTransform(source_detection.points, target_markers)
        source_to_normalized_transform = transformation.tolist()
        normalized = cv2.warpPerspective(
            source,
            transformation,
            (normalized_width, normalized_height),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255),
        )
        local_alignment = LocalAlignment(normalized, False, 0.0, 0, 0.0, 0.0)
    elif automatic_marker_detection:
        if reference is not None:
            (
                normalized,
                detected_rotation_degrees,
                reference_alignment_error,
                reference_column_correlation,
            ) = _normalize_orientation(
                source,
                source_detection.points,
                reference,
                target_markers,
            )
            if (
                reference_alignment_error > MAXIMUM_REFERENCE_ALIGNMENT_ERROR
                or reference_column_correlation < MINIMUM_REFERENCE_COLUMN_CORRELATION
            ):
                automatic_marker_detection = False
                marker_warning = (
                    "La feuille est incomplète ou ses repères ne délimitent pas une page cohérente. "
                    "Repositionnez-les manuellement avant d’accepter le formulaire."
                )
                normalized = source
                normalized_width = source_width
                normalized_height = source_height
                target_markers = source_detection.points
                local_alignment = LocalAlignment(normalized, False, 0.0, 0, 0.0, 0.0)
            else:
                if apply_local_alignment:
                    local_alignment = align_locally(normalized, reference)
                    normalized = local_alignment.image
                else:
                    local_alignment = LocalAlignment(normalized, False, 0.0, 0, 0.0, 0.0)
        else:
            transformation = cv2.getPerspectiveTransform(source_detection.points, target_markers)
            normalized = cv2.warpPerspective(
                source,
                transformation,
                (normalized_width, normalized_height),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=(255, 255, 255),
            )
            local_alignment = LocalAlignment(normalized, False, 0.0, 0, 0.0, 0.0)
    else:
        # Preserve the untouched page for manual placement. Resizing it here
        # would make the displayed coordinates diverge from the original.
        normalized = source
        normalized_width = source_width
        normalized_height = source_height
        target_markers = source_detection.points
        local_alignment = LocalAlignment(normalized, False, 0.0, 0, 0.0, 0.0)
    # La qualité utile est celle de la feuille normalisée. Mesurer toute la
    # photographie pénaliserait artificiellement un formulaire petit dans le
    # cadre à cause de l'arrière-plan qui l'entoure.
    quality, warnings = analyze_quality(normalized, source_detection.confidence)
    if (
        reference is not None
        and automatic_marker_detection
        and reference_alignment_error <= TRUSTED_REFERENCE_ALIGNMENT_ERROR
    ):
        # Une comparaison très précise avec la page de référence confirme la
        # géométrie finale, même si la feuille n'occupe pas la position
        # habituelle dans la photographie source.
        warnings = [
            warning for warning in warnings
            if not warning.startswith("La géométrie des repères est inhabituelle")
        ]
    if marker_warning:
        warnings.insert(0, marker_warning)
    if (
        reference is not None
        and automatic_marker_detection
        and apply_local_alignment
        and not local_alignment.applied
        and local_alignment.confidence == 0
        and reference_alignment_error > TRUSTED_REFERENCE_ALIGNMENT_ERROR
    ):
        warnings.append(
            "Le recalage local n’a pas trouvé suffisamment de détails fiables ; "
            "vérifiez les cases dans la validation."
        )
    encoded = (
        base64.b64encode(encode_png(normalized)).decode("ascii")
        if include_normalized_image
        else None
    )
    identification = recognize_identification(normalized, template_xml)
    corrections = (
        recognize_corrections(normalized, template_xml)
        if recognize_correction_marks
        else []
    )

    status = (
        "MANUAL_REVIEW_REQUIRED"
        if not automatic_marker_detection and forced_source_markers is None
        else ("READY" if not warnings else "READY_WITH_WARNINGS")
    )
    return ProcessResponse(
        status=status,
        automatic_marker_detection=automatic_marker_detection,
        manual_review_required=(not automatic_marker_detection and forced_source_markers is None) or bool(warnings),
        detected_rotation_degrees=detected_rotation_degrees,
        reference_alignment_error=reference_alignment_error,
        local_alignment_applied=local_alignment.applied,
        local_alignment_confidence=local_alignment.confidence,
        local_alignment_anchor_count=local_alignment.anchor_count,
        local_alignment_mean_displacement=local_alignment.mean_displacement,
        local_alignment_maximum_displacement=local_alignment.maximum_displacement,
        source_width=source_width,
        source_height=source_height,
        normalized_width=normalized_width,
        normalized_height=normalized_height,
        source_markers=_marker_model(source_detection.points),
        target_markers=_marker_model(target_markers),
        source_to_normalized_transform=source_to_normalized_transform,
        quality=quality,
        identification=identification,
        corrections=corrections,
        warnings=warnings,
        normalized_image_base64=encoded,
    )
