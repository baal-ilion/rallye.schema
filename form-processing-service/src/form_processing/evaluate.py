"""Évalue la détection des repères sur un corpus historique local."""

from __future__ import annotations

import argparse
import json
import statistics
import time
from collections import Counter
from pathlib import Path

import cv2
import numpy as np

from .errors import ProcessingError
from .markers import detect_markers
from .quality import analyze_quality
from .registration import align_locally


CORNER_NAMES = ("TOP_LEFT", "TOP_RIGHT", "BOTTOM_RIGHT", "BOTTOM_LEFT")


def _read_image(path: Path) -> np.ndarray:
    content = np.fromfile(path, dtype=np.uint8)
    image = cv2.imdecode(content, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Image illisible : {path}")
    return image


def _percentile(values: list[float], percentile: float) -> float | None:
    if not values:
        return None
    return float(np.percentile(values, percentile))


def _printed_edge_error(image: np.ndarray, reference: np.ndarray) -> float:
    source_gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    reference_gray = cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY)
    source_edges = cv2.Canny(source_gray, 60, 170)
    reference_edges = cv2.Canny(reference_gray, 60, 170)
    distances = cv2.distanceTransform(255 - source_edges, cv2.DIST_L2, 3)
    values = distances[reference_edges > 0]
    return float(np.percentile(values, 75)) if values.size else 0.0


def evaluate(corpus_root: Path, references_root: Path) -> dict:
    corpus = json.loads((corpus_root / "manifest.json").read_text(encoding="utf-8"))
    reference_manifest = json.loads((references_root / "manifest.json").read_text(encoding="utf-8-sig"))
    references = {(item["challenge"], item["page"]): item for item in reference_manifest}

    results: list[dict] = []
    durations: list[float] = []
    mean_errors: list[float] = []
    max_errors: list[float] = []
    local_confidences: list[float] = []
    local_improvements: list[float] = []
    local_applied = 0
    reference_cache: dict[tuple[int, int], tuple[np.ndarray, np.ndarray]] = {}
    status_counts: Counter[str] = Counter()
    warning_counts: Counter[str] = Counter()

    for item in corpus["items"]:
        started_at = time.perf_counter()
        record = {
            "id": item["id"],
            "challenge": item["challenge"],
            "page": item["page"],
            "team": item["team"],
            "file": item["file"],
        }
        reference = references.get((item["challenge"], item["page"]))
        if reference is None:
            record.update(status="NO_REFERENCE", error="Aucune référence associée.")
            status_counts["NO_REFERENCE"] += 1
            results.append(record)
            continue

        try:
            image = _read_image(corpus_root / item["file"])
            detection = detect_markers(image)
            reference_key = (item["challenge"], item["page"])
            if reference_key not in reference_cache:
                reference_image = _read_image(references_root / reference["image"])
                reference_cache[reference_key] = (reference_image, detect_markers(reference_image).points)
            reference_image, reference_markers = reference_cache[reference_key]
            normalized = cv2.warpPerspective(
                image,
                cv2.getPerspectiveTransform(detection.points, reference_markers),
                (reference_image.shape[1], reference_image.shape[0]),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=(255, 255, 255),
            )
            before_local_error = _printed_edge_error(normalized, reference_image)
            local = align_locally(normalized, reference_image)
            after_local_error = _printed_edge_error(local.image, reference_image)
            improvement = before_local_error - after_local_error
            local_confidences.append(local.confidence)
            local_improvements.append(improvement)
            if local.applied:
                local_applied += 1
            quality, warnings = analyze_quality(image, detection.confidence)
            historical = item["filledForm"]["corners"]
            expected = np.array(
                [[historical[name]["x"], historical[name]["y"]] for name in CORNER_NAMES],
                dtype=np.float32,
            )
            errors = np.linalg.norm(detection.points - expected, axis=1)
            mean_error = float(errors.mean())
            max_error = float(errors.max())
            mean_errors.append(mean_error)
            max_errors.append(max_error)
            warning_counts.update(warnings)
            record.update(
                status="DETECTED",
                reference=reference["image"],
                detected_markers=detection.points.tolist(),
                expected_markers=expected.tolist(),
                marker_confidence=detection.confidence,
                marker_mean_error_px=mean_error,
                marker_max_error_px=max_error,
                quality=quality.model_dump(),
                warnings=warnings,
                local_alignment={
                    "applied": local.applied,
                    "confidence": local.confidence,
                    "anchor_count": local.anchor_count,
                    "mean_displacement": local.mean_displacement,
                    "maximum_displacement": local.maximum_displacement,
                    "printed_edge_error_before": before_local_error,
                    "printed_edge_error_after": after_local_error,
                    "printed_edge_improvement": improvement,
                },
            )
            status_counts["DETECTED"] += 1
        except (ProcessingError, ValueError, KeyError) as error:
            code = error.code if isinstance(error, ProcessingError) else type(error).__name__
            message = error.message if isinstance(error, ProcessingError) else str(error)
            record.update(status="FAILED", error_code=code, error=message)
            status_counts["FAILED"] += 1
        finally:
            duration = (time.perf_counter() - started_at) * 1000
            record["duration_ms"] = duration
            durations.append(duration)
            results.append(record) if record not in results else None

    summary = {
        "total": len(corpus["items"]),
        "statuses": dict(status_counts),
        "detection_rate": status_counts["DETECTED"] / len(corpus["items"]) if corpus["items"] else 0,
        "marker_error_px": {
            "mean": statistics.fmean(mean_errors) if mean_errors else None,
            "p50": _percentile(mean_errors, 50),
            "p95": _percentile(mean_errors, 95),
            "maximum": max(max_errors) if max_errors else None,
        },
        "duration_ms": {
            "mean": statistics.fmean(durations) if durations else None,
            "p95": _percentile(durations, 95),
        },
        "warnings": dict(warning_counts),
        "local_alignment": {
            "applied": local_applied,
            "application_rate": local_applied / len(corpus["items"]) if corpus["items"] else 0,
            "confidence_mean": statistics.fmean(local_confidences) if local_confidences else None,
            "printed_edge_improvement_mean": statistics.fmean(local_improvements) if local_improvements else None,
            "printed_edge_improvement_p05": _percentile(local_improvements, 5),
        },
    }
    return {"summary": summary, "items": results}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("corpus", type=Path)
    parser.add_argument("references", type=Path)
    parser.add_argument("--output", type=Path)
    arguments = parser.parse_args()
    report = evaluate(arguments.corpus, arguments.references)
    serialized = json.dumps(report, ensure_ascii=False, indent=2)
    if arguments.output:
        arguments.output.write_text(serialized, encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
