from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(frozen=True)
class LocalAlignment:
    image: np.ndarray
    applied: bool
    confidence: float
    anchor_count: int
    mean_displacement: float
    maximum_displacement: float


def _edge_map(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    normalized = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    return cv2.Canny(normalized, 60, 170)


def _fill_grid(values: np.ndarray, valid: np.ndarray) -> np.ndarray:
    if valid.all():
        return values
    missing = (~valid).astype(np.uint8)
    return cv2.inpaint(values.astype(np.float32), missing, 3, cv2.INPAINT_NS)


def _printed_edge_error(image: np.ndarray, reference: np.ndarray) -> float:
    source_edges = _edge_map(image)
    reference_edges = _edge_map(reference)
    distances = cv2.distanceTransform(255 - source_edges, cv2.DIST_L2, 3)
    values = distances[reference_edges > 0]
    return float(np.percentile(values, 75)) if values.size else 0.0


def _interior_weight(width: int, height: int) -> np.ndarray:
    """Préserve les repères sans neutraliser les cases proches des bords."""
    x, y = np.meshgrid(
        np.arange(width, dtype=np.float32),
        np.arange(height, dtype=np.float32),
    )
    edge_distance = np.minimum.reduce((x, width - 1 - x, y, height - 1 - y))
    edge_start = max(1.0, min(width, height) * 0.012)
    edge_end = max(edge_start + 1.0, min(width, height) * 0.025)
    weight = np.clip((edge_distance - edge_start) / (edge_end - edge_start), 0.0, 1.0)

    inner_radius = min(width, height) * 0.045
    outer_radius = min(width, height) * 0.080
    for center_x, center_y in (
        (0.12 * width, 0.08 * height),
        (0.88 * width, 0.08 * height),
        (0.88 * width, 0.92 * height),
        (0.12 * width, 0.92 * height),
    ):
        distance = np.hypot(x - center_x, y - center_y)
        marker_weight = np.clip((distance - inner_radius) / (outer_radius - inner_radius), 0.0, 1.0)
        weight = np.minimum(weight, marker_weight)
    return weight


def align_locally(image: np.ndarray, reference: np.ndarray) -> LocalAlignment:
    """Corrige les déformations souples résiduelles après l'homographie globale.

    Les ancrages proviennent exclusivement des contours imprimés de la
    référence. Les marques manuscrites peuvent donc faire baisser la confiance,
    mais ne deviennent pas des points de recalage.
    """
    height, width = reference.shape[:2]
    if image.shape[:2] != (height, width):
        raise ValueError("L'image et sa référence doivent avoir les mêmes dimensions.")

    scale = min(1.0, 1400.0 / max(width, height))
    working_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    source_edges = _edge_map(cv2.resize(image, working_size, interpolation=cv2.INTER_AREA))
    reference_edges = _edge_map(cv2.resize(reference, working_size, interpolation=cv2.INTER_AREA))
    working_height, working_width = reference_edges.shape

    rows, columns = 10, 7
    patch_radius = max(18, round(min(working_width, working_height) * 0.035))
    search_radius = max(10, round(min(working_width, working_height) * 0.018))
    displacements_x = np.zeros((rows, columns), dtype=np.float32)
    displacements_y = np.zeros((rows, columns), dtype=np.float32)
    valid = np.zeros((rows, columns), dtype=bool)
    scores: list[float] = []

    grid_x = np.linspace(0.10 * working_width, 0.90 * working_width, columns)
    grid_y = np.linspace(0.10 * working_height, 0.90 * working_height, rows)
    for row, center_y in enumerate(grid_y):
        for column, center_x in enumerate(grid_x):
            x, y = round(center_x), round(center_y)
            x1, x2 = x - patch_radius, x + patch_radius + 1
            y1, y2 = y - patch_radius, y + patch_radius + 1
            sx1, sx2 = x1 - search_radius, x2 + search_radius
            sy1, sy2 = y1 - search_radius, y2 + search_radius
            if sx1 < 0 or sy1 < 0 or sx2 > working_width or sy2 > working_height:
                continue

            template = reference_edges[y1:y2, x1:x2]
            # Les zones blanches ou presque vides ne constituent pas des
            # ancrages fiables.
            if cv2.countNonZero(template) / template.size < 0.025:
                continue
            search = source_edges[sy1:sy2, sx1:sx2]
            correlation = cv2.matchTemplate(search, template, cv2.TM_CCOEFF_NORMED)
            _, score, _, best = cv2.minMaxLoc(correlation)
            if score < 0.42:
                continue

            dx = best[0] - search_radius
            dy = best[1] - search_radius
            # A repeated table line can create a convincing but isolated false
            # match. Large jumps are left to manual review.
            if np.hypot(dx, dy) > search_radius * 1.15:
                continue
            displacements_x[row, column] = dx
            displacements_y[row, column] = dy
            valid[row, column] = True
            scores.append(float(score))

    anchor_count = int(valid.sum())
    if anchor_count < 8:
        return LocalAlignment(image, False, 0.0, anchor_count, 0.0, 0.0)

    dx_grid = _fill_grid(displacements_x, valid)
    dy_grid = _fill_grid(displacements_y, valid)
    dx_grid = cv2.GaussianBlur(dx_grid, (3, 3), 0)
    dy_grid = cv2.GaussianBlur(dy_grid, (3, 3), 0)
    dx = cv2.resize(dx_grid, (width, height), interpolation=cv2.INTER_CUBIC) / scale
    dy = cv2.resize(dy_grid, (width, height), interpolation=cv2.INTER_CUBIC) / scale
    border_protection = _interior_weight(width, height)
    dx *= border_protection
    dy *= border_protection

    coordinates_x, coordinates_y = np.meshgrid(
        np.arange(width, dtype=np.float32),
        np.arange(height, dtype=np.float32),
    )
    map_x = np.asarray(coordinates_x + dx, dtype=np.float32)
    map_y = np.asarray(coordinates_y + dy, dtype=np.float32)
    corrected = cv2.remap(
        image,
        map_x,
        map_y,
        cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    corrected[border_protection <= 0] = image[border_protection <= 0]
    confidence = float(np.clip(np.mean(scores) * min(1.0, anchor_count / 24.0), 0.0, 1.0))
    magnitudes = np.hypot(dx_grid[valid], dy_grid[valid]) / scale
    # Never keep a deformation merely because matches were found. Printed
    # contours must objectively move closer to the reference.
    before_error = _printed_edge_error(image, reference)
    after_error = _printed_edge_error(corrected, reference)
    if after_error >= before_error - 0.05:
        return LocalAlignment(
            image,
            False,
            confidence,
            anchor_count,
            float(np.mean(magnitudes)),
            float(np.max(magnitudes)),
        )
    return LocalAlignment(
        corrected,
        True,
        confidence,
        anchor_count,
        float(np.mean(magnitudes)),
        float(np.max(magnitudes)),
    )
