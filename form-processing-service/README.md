# Form Processing Service

Prototype du futur moteur de traitement des formulaires Rallye Schéma.

Il reçoit indifféremment un scan ou une photographie, détecte les quatre repères
de page, corrige la perspective et produit une image normalisée. Il est sans
état : le `response-service` reste propriétaire du stockage et des données
métier.

## API

- `GET /health`
- `POST /api/v1/forms/process`
  - `image` : image à traiter ;
  - `reference` : PNG de référence du designer, recommandé ;
  - `target_width` et `target_height` : dimensions cibles en l’absence de référence.

La réponse contient l’image PNG normalisée en Base64, les repères, les dimensions,
des métriques de qualité et les avertissements.

## Développement

```shell
python -m venv .venv
pip install -e ".[test]"
pytest
uvicorn form_processing.main:app --reload --port 8080
```

## Docker

```shell
docker build -t rallye-schema-form-processing-service:local .
docker run --rm -p 8080:8080 rallye-schema-form-processing-service:local
```
