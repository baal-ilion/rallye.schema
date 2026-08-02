import base64

import cv2

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse

from .errors import ProcessingError
from .identification import recognize_corrections
from .image_io import decode_image, encode_png
from .models import CorrectionResponse, ProcessResponse, ProcessingProblem
from .processor import process_image
from .registration import align_locally


app = FastAPI(
    title="Rallye Schéma — Form Processing Service",
    version="0.1.0",
    description="Normalisation et reconnaissance des formulaires scannés ou photographiés.",
)


@app.exception_handler(ProcessingError)
async def processing_error_handler(_: Request, error: ProcessingError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content=ProcessingProblem(code=error.code, message=error.message).model_dump(),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "UP"}


@app.post("/api/v1/forms/recognize-corrections", response_model=CorrectionResponse)
async def recognize_form_corrections(
    image: UploadFile = File(...),
    reference: UploadFile | None = File(None),
    template_xml: str = Form(...),
) -> CorrectionResponse:
    """Lit les cases d'une image déjà normalisée, sans la transformer à nouveau."""
    normalized = decode_image(await image.read())
    page_reference = None
    if reference:
        page_reference = decode_image(await reference.read())
        if page_reference.shape[:2] != normalized.shape[:2]:
            page_reference = cv2.resize(
                page_reference,
                (normalized.shape[1], normalized.shape[0]),
                interpolation=cv2.INTER_AREA,
            )
        normalized = align_locally(normalized, page_reference).image
    return CorrectionResponse(
        corrections=recognize_corrections(normalized, template_xml),
        normalized_image_base64=base64.b64encode(encode_png(normalized)).decode("ascii"),
    )


@app.post("/api/v1/forms/process", response_model=ProcessResponse)
async def process_form(
    image: UploadFile = File(...),
    reference: UploadFile | None = File(None),
    target_width: int | None = Form(None),
    target_height: int | None = Form(None),
    template_xml: str | None = Form(None),
    apply_local_alignment: bool = Form(True),
) -> ProcessResponse:
    if target_width is not None and not 800 <= target_width <= 6000:
        raise ProcessingError("INVALID_TARGET_SIZE", "La largeur cible doit être comprise entre 800 et 6000 pixels.")
    if target_height is not None and not 1000 <= target_height <= 8000:
        raise ProcessingError("INVALID_TARGET_SIZE", "La hauteur cible doit être comprise entre 1000 et 8000 pixels.")

    return process_image(
        await image.read(),
        await reference.read() if reference else None,
        target_width,
        target_height,
        template_xml,
        apply_local_alignment,
    )
