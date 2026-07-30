from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse

from .errors import ProcessingError
from .models import ProcessResponse, ProcessingProblem
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
    )

