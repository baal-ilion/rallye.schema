from io import BytesIO

import cv2
import numpy as np
from fastapi.testclient import TestClient

from form_processing.main import app


client = TestClient(app)


def _plain_image() -> bytes:
    image = np.full((1200, 900, 3), 255, dtype=np.uint8)
    ok, encoded = cv2.imencode(".png", image)
    assert ok
    return encoded.tobytes()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP"}


def test_keeps_the_form_for_manual_review_when_markers_are_missing():
    response = client.post(
        "/api/v1/forms/process",
        files={"image": ("empty-form.png", BytesIO(_plain_image()), "image/png")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "MANUAL_REVIEW_REQUIRED"
    assert body["automatic_marker_detection"] is False
    assert body["manual_review_required"] is True
    assert body["normalized_width"] == 900
    assert body["normalized_height"] == 1200
    assert "manuellement" in body["warnings"][0]


def test_reads_corrections_without_normalizing_the_image_again():
    image = np.full((1200, 900, 3), 255, dtype=np.uint8)
    cv2.rectangle(image, (438, 588), (462, 612), (0, 0, 0), -1)
    ok, encoded = cv2.imencode(".png", image)
    assert ok
    template = """<template><fields><group>
      <question question="Q1"><values>
        <value response="O"><point x="400" y="600"/></value>
        <value response="N"><point x="425" y="600"/></value>
        <value response="Y"><point x="450" y="600"/></value>
      </values></question>
    </group></fields></template>"""

    response = client.post(
        "/api/v1/forms/recognize-corrections",
        files={"image": ("normalized.png", BytesIO(encoded.tobytes()), "image/png")},
        data={"template_xml": template},
    )

    assert response.status_code == 200
    assert response.json()["corrections"][0]["label"] == "Q1"
    assert response.json()["corrections"][0]["marked_values"] == ["Y"]
    assert response.json()["corrections"][0]["value"] is True
    assert response.json()["normalized_content_type"] == "image/png"
    assert response.json()["normalized_image_base64"]


def test_reads_corrections_without_normalizing_the_image_again():
    image = np.full((1200, 900, 3), 255, dtype=np.uint8)
    cv2.rectangle(image, (438, 588), (462, 612), (0, 0, 0), -1)
    ok, encoded = cv2.imencode(".png", image)
    assert ok
    template = """<template><fields><group>
      <question question="Q1"><values>
        <value response="O"><point x="400" y="600"/></value>
        <value response="N"><point x="425" y="600"/></value>
        <value response="Y"><point x="450" y="600"/></value>
      </values></question>
    </group></fields></template>"""

    response = client.post(
        "/api/v1/forms/recognize-corrections",
        files={"image": ("normalized.png", BytesIO(encoded.tobytes()), "image/png")},
        data={"template_xml": template},
    )

    assert response.status_code == 200
    assert response.json()["corrections"][0]["label"] == "Q1"
    assert response.json()["corrections"][0]["marked_values"] == ["Y"]
    assert response.json()["corrections"][0]["value"] is True
