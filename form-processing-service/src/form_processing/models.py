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

class IdentificationResult(BaseModel):
    team: int | None = None
    stage: int | None = None
    page: int | None = None
    confidence: float = Field(ge=0, le=1)

class CorrectionResult(BaseModel):
    label: str
    marked_values: list[str]
    value: bool
    confidence: float = Field(ge=0, le=1)


class CorrectionResponse(BaseModel):
    corrections: list[CorrectionResult] = Field(default_factory=list)
    normalized_content_type: str = "image/png"
    normalized_image_base64: str


class ProcessResponse(BaseModel):
    status: str
    automatic_marker_detection: bool
    manual_review_required: bool
    detected_rotation_degrees: int
    reference_alignment_error: float
    local_alignment_applied: bool
    local_alignment_confidence: float = Field(ge=0, le=1)
    local_alignment_anchor_count: int = Field(ge=0)
    local_alignment_mean_displacement: float = Field(ge=0)
    local_alignment_maximum_displacement: float = Field(ge=0)
    source_width: int
    source_height: int
    normalized_width: int
    normalized_height: int
    source_markers: MarkerSet
    target_markers: MarkerSet
    quality: QualityMetrics
    identification: IdentificationResult | None = None
    corrections: list[CorrectionResult] = Field(default_factory=list)
    warnings: list[str]
    normalized_content_type: str = "image/png"
    normalized_image_base64: str


class ProcessingProblem(BaseModel):
    code: str
    message: str
