import base64

import cv2
import numpy as np

from .image_io import decode_image, encode_png
from .errors import ProcessingError
from .markers import DetectedMarkers, detect_markers
from .models import MarkerSet, Point, ProcessResponse
from .quality import analyze_quality
from .registration import LocalAlignment, align_locally


DEFAULT_WIDTH = 2480
DEFAULT_HEIGHT = 3508


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


def process_image(
    image_content: bytes,
    reference_content: bytes | None = None,
    target_width: int | None = None,
    target_height: int | None = None,
) -> ProcessResponse:
    source = decode_image(image_content)
    source_height, source_width = source.shape[:2]
    marker_warning: str | None = None
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
        reference = decode_image(reference_content)
        normalized_height, normalized_width = reference.shape[:2]
        target_detection: DetectedMarkers = detect_markers(reference)
        target_markers = target_detection.points
    else:
        normalized_width = target_width or DEFAULT_WIDTH
        normalized_height = target_height or DEFAULT_HEIGHT
        target_markers = _default_target(normalized_width, normalized_height)

    if automatic_marker_detection:
        transformation = cv2.getPerspectiveTransform(source_detection.points, target_markers)
        normalized = cv2.warpPerspective(
            source,
            transformation,
            (normalized_width, normalized_height),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255),
        )
        local_alignment = (
            align_locally(normalized, reference)
            if reference is not None
            else LocalAlignment(normalized, False, 0.0, 0, 0.0, 0.0)
        )
        normalized = local_alignment.image
    else:
        # Preserve the untouched page for manual placement. Resizing it here
        # would make the displayed coordinates diverge from the original.
        normalized = source
        normalized_width = source_width
        normalized_height = source_height
        target_markers = source_detection.points
        local_alignment = LocalAlignment(normalized, False, 0.0, 0, 0.0, 0.0)
    quality, warnings = analyze_quality(source, source_detection.confidence)
    if marker_warning:
        warnings.insert(0, marker_warning)
    if (
        reference is not None
        and automatic_marker_detection
        and not local_alignment.applied
        and local_alignment.confidence == 0
    ):
        warnings.append(
            "Le recalage local n’a pas trouvé suffisamment de détails fiables ; "
            "vérifiez les cases dans la validation."
        )
    encoded = base64.b64encode(encode_png(normalized)).decode("ascii")

    status = (
        "MANUAL_REVIEW_REQUIRED"
        if not automatic_marker_detection
        else ("READY" if not warnings else "READY_WITH_WARNINGS")
    )
    return ProcessResponse(
        status=status,
        automatic_marker_detection=automatic_marker_detection,
        manual_review_required=not automatic_marker_detection or bool(warnings),
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
        quality=quality,
        warnings=warnings,
        normalized_image_base64=encoded,
    )
