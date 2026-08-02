import cv2
import numpy as np

from .models import QualityMetrics


def analyze_quality(image: np.ndarray, marker_confidence: float) -> tuple[QualityMetrics, list[str]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    laplacian_variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    mean = float(gray.mean())
    standard_deviation = float(gray.std())

    sharpness = float(np.clip(laplacian_variance / 650.0, 0.0, 1.0))
    brightness = float(np.clip(1 - abs(mean - 185) / 185, 0.0, 1.0))
    contrast = float(np.clip(standard_deviation / 75.0, 0.0, 1.0))

    warnings: list[str] = []
    if sharpness < 0.28:
        warnings.append("La photographie semble floue.")
    if mean < 75:
        warnings.append("La photographie est très sombre.")
    elif mean > 250 and contrast < 0.25:
        warnings.append("La photographie est surexposée.")
    if contrast < 0.25:
        warnings.append("Le contraste est faible.")
    if marker_confidence < 0.55:
        warnings.append("La géométrie des repères est inhabituelle ; une vérification est recommandée.")

    return (
        QualityMetrics(
            sharpness=sharpness,
            brightness=brightness,
            contrast=contrast,
            marker_confidence=marker_confidence,
        ),
        warnings,
    )
