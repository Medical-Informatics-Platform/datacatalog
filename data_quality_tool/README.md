# Data Quality Tool

This service converts and validates DataCatalog payloads between Excel and JSON formats. It exposes Flask endpoints used by the backend and can also be run independently during development.

## Endpoints

- `GET /`: basic welcome response
- `POST /excel-to-json`
- `POST /json-to-excel`
- `POST /validate-json`
- `POST /validate-excel`

## Local Development

### Prerequisites

- Python `3.9+`
- Poetry

### Install And Run

```bash
poetry install --with dev
poetry run python controller.py
```

The service listens on `http://localhost:8000`.

## Testing And Formatting

- `poetry run pytest`
- `poetry run black .`

## Docker

Build and run the container from this directory:

```bash
docker build -t data-quality-tool .
docker run --rm -p 8000:8000 data-quality-tool
```

## Configuration

- `MAX_UPLOAD_SIZE_MB`: optional upload size limit, default `20`
- `FLASK_ENV` and `FLASK_DEBUG`: Flask runtime flags used by the compose setup

## Project Layout

- `controller.py`: Flask routes and request handling
- `converter/`: Excel to JSON and JSON to Excel logic
- `validator/`: validation rules for both formats
- `tests/`: unit and endpoint coverage plus sample fixtures
