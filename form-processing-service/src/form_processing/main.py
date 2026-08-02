import json

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse

from .errors import ProcessingError
from .models import MarkerSet, ProcessResponse, ProcessingProblem
from .processor import process_image


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


@app.post("/api/v1/forms/process", response_model=ProcessResponse)
async def process_form(
    image: UploadFile = File(...),
    reference: UploadFile | None = File(None),
    target_width: int | None = Form(None),
    target_height: int | None = Form(None),
    template_xml: str | None = Form(None),
    apply_local_alignment: bool = Form(True),
    source_markers: str | None = Form(None),
    recognize_correction_marks: bool = Form(True),
    include_normalized_image: bool = Form(True),
) -> ProcessResponse:
    if target_width is not None and not 800 <= target_width <= 6000:
        raise ProcessingError("INVALID_TARGET_SIZE", "La largeur cible doit être comprise entre 800 et 6000 pixels.")
    if target_height is not None and not 1000 <= target_height <= 8000:
        raise ProcessingError("INVALID_TARGET_SIZE", "La hauteur cible doit être comprise entre 1000 et 8000 pixels.")

    forced_markers = None
    if source_markers:
        try:
            forced_markers = MarkerSet.model_validate(json.loads(source_markers))
        except (ValueError, TypeError) as error:
            raise ProcessingError(
                "INVALID_SOURCE_MARKERS",
                "Les quatre repères manuels sont invalides.",
            ) from error

    return process_image(
        await image.read(),
        await reference.read() if reference else None,
        target_width,
        target_height,
        template_xml,
        apply_local_alignment,
        forced_markers,
        recognize_correction_marks,
        include_normalized_image,
    )
