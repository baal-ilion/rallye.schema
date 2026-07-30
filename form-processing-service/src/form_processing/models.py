from pydantic import BaseModel, Field


class Point(BaseModel):
    x: float
    y: float


class MarkerSet(BaseModel):
    top_left: Point
    top_right: Point
    bottom_right: Point
    bottom_left: Point


class QualityMetrics(BaseModel):
    sharpness: float = Field(ge=0, le=1)
    brightness: float = Field(ge=0, le=1)
    contrast: float = Field(ge=0, le=1)
    marker_confidence: float = Field(ge=0, le=1)


class ProcessResponse(BaseModel):
    status: str
    automatic_marker_detection: bool
    manual_review_required: bool
    source_width: int
    source_height: int
    normalized_width: int
    normalized_height: int
    source_markers: MarkerSet
    target_markers: MarkerSet
    quality: QualityMetrics
    warnings: list[str]
    normalized_content_type: str = "image/png"
    normalized_image_base64: str


class ProcessingProblem(BaseModel):
    code: str
    message: str
