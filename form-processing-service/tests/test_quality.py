import cv2
import numpy as np

from form_processing.quality import analyze_quality


def _document(width: int, height: int) -> np.ndarray:
    image = np.full((height, width, 3), 255, dtype=np.uint8)
    for y in range(height // 8, height * 7 // 8, max(20, height // 18)):
        cv2.line(image, (width // 8, y), (width * 7 // 8, y), (0, 0, 0), max(2, width // 600))
    cv2.putText(image, "FORMULAIRE", (width // 5, height // 10),
                cv2.FONT_HERSHEY_SIMPLEX, max(0.7, width / 1200), (0, 0, 0), max(2, width // 500))
    return image


def test_sharpness_is_comparable_for_high_resolution_document():
    document = _document(1200, 1700)
    high_resolution = cv2.resize(document, (2400, 3400), interpolation=cv2.INTER_CUBIC)

    standard_quality, standard_warnings = analyze_quality(document, 0.9)
    high_quality, high_warnings = analyze_quality(high_resolution, 0.9)

    assert "La photographie semble floue." not in standard_warnings
    assert "La photographie semble floue." not in high_warnings
    assert abs(standard_quality.sharpness - high_quality.sharpness) < 0.2


def test_genuinely_blurred_document_still_requires_attention():
    document = _document(1200, 1700)
    blurred = cv2.GaussianBlur(document, (41, 41), 12)

    _, warnings = analyze_quality(blurred, 0.9)

    assert "La photographie semble floue." in warnings
