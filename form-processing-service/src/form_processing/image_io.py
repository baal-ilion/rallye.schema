from io import BytesIO

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from .errors import ProcessingError


def decode_image(content: bytes) -> np.ndarray:
    if not content:
        raise ProcessingError("EMPTY_IMAGE", "Le fichier image est vide.")
    try:
        with Image.open(BytesIO(content)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            rgb = np.asarray(image)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ProcessingError(
            "UNSUPPORTED_IMAGE",
            "Le fichier ne contient pas une image exploitable.",
            415,
        ) from exc
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def encode_png(image: np.ndarray) -> bytes:
    success, encoded = cv2.imencode(".png", image, [cv2.IMWRITE_PNG_COMPRESSION, 3])
    if not success:
        raise ProcessingError("ENCODING_FAILED", "L’image normalisée n’a pas pu être encodée.", 500)
    return encoded.tobytes()

