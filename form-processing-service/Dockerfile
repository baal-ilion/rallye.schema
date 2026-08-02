FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src ./src

FROM base AS test

COPY tests ./tests
RUN pip install --no-cache-dir ".[test]"
CMD ["pytest", "-q"]

FROM base AS runtime

RUN pip install --no-cache-dir .

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health', timeout=3)"

CMD ["uvicorn", "form_processing.main:app", "--host", "0.0.0.0", "--port", "8080"]
