# Data Quality Tool

This service converts and validates DataCatalog payloads between Excel and JSON formats. It exposes
Flask endpoints used by the backend and can also be run independently during development.

## Endpoints

- `GET /`: plain-text welcome response, used by the Compose healthcheck and the Helm probes
- `POST /excel-to-json`: multipart upload with a `file` field; returns the converted data model as
  pretty-printed JSON. The `version` and `longitudinal` form fields belong to the backend endpoint
  `POST /services/datamodels/import`, which adds them to the converted payload
- `POST /json-to-excel`: JSON data model in the request body; returns an `output.xlsx` attachment
- `POST /validate-json`: JSON data model in the request body; `{"message": "Data model is valid."}`
  when it passes
- `POST /validate-excel`: multipart upload with a `file` field; same success body

Responses:

- `400` with `{"error": "..."}` for a missing file, a missing or invalid JSON body, or a failed
  validation. A validation report is rendered as its first non-empty line, capped at 300 characters,
  by `error_reporting.client_error_message`; text that looks like a stack trace is replaced with
  `The data model could not be validated.`
- `413` with `{"error": "Uploaded file exceeds the maximum allowed size."}` when the body exceeds
  `MAX_UPLOAD_SIZE_MB`
- `500` with `{"error": "Internal server error"}` for unexpected failures, which are logged with
  their traceback and never returned to the caller

## Validation Rules

Excel workbooks must contain exactly these columns: `csvFile`, `name`, `code`, `type`, `values`,
`unit`, `description`, `canBeNull`, `comments`, `conceptPath`, `methodology`. `name`, `code`, `type`,
and `conceptPath` are required on every row, `type` must be `nominal`, `real`, `integer`, or `text`,
`values` is checked as `{"code", "label"}, ...` for `nominal` and as `<min>-<max>` for `real` and
`integer` whenever it is filled in, duplicate enumeration codes are rejected, and `conceptPath` must
look like `characters/characters/...`.

JSON data models must carry non-empty `code`, `version`, `label`, and a `groups` list. Every group
needs a `code` that is unique within its path, and every Common Data Element needs `code`, `type`,
`sql_type`, and `isCategorical` that agree with the mapping `nominal` → `text`/`true`,
`real` → `real`/`false`, `integer` → `int`/`false`, `text` → `text`/`false`. Categorical elements
require `enumerations`, `minValue` must be below `maxValue`, element codes must be unique inside a
group, at least one dataset element (`code: dataset`, `sql_type: text`, categorical) must exist, and
longitudinal models must define `subjectid` and `visitid`.

## Local Development

### Prerequisites

- Python `^3.12` (as pinned in `pyproject.toml`; the image uses `python:3.12.14-slim`)
- Poetry 2.x

### Install And Run

```bash
poetry install --with dev
poetry run python controller.py
```

The service listens on `http://localhost:8000`. For a production-like server use
`poetry run gunicorn --bind 0.0.0.0:8000 controller:app`.

## Testing And Formatting

- `poetry run pytest`
- `poetry run black .`

CI (`.github/workflows/data_quality_tool.yml`) runs the suite under Python 3.12 with Poetry 2.4.3
through `coverage` and uploads to Codecov when `CODECOV_TOKEN` is set.

## Docker

Build and run the container from this directory:

```bash
docker build -t data-quality-tool .
docker run --rm -p 8000:8000 data-quality-tool
```

The image installs Poetry 2.x with `poetry install --without dev` and starts Gunicorn on port `8000`.
`tests/` is excluded from the image by `.dockerignore`.

## Configuration

- `MAX_UPLOAD_SIZE_MB`: optional upload size limit, default `20` (set from `compose.yaml` and from
  `dqt.maxUploadSizeMb` in the Helm chart)
- `FLASK_ENV` and `FLASK_DEBUG`: Flask runtime flags used by `compose.yaml` and the Helm chart

## Project Layout

- `controller.py`: Flask routes, upload limit, and error handlers
- `converter/`: Excel to JSON (`excel_to_json.py`) and JSON to Excel (`json_to_excel.py`) logic
- `validator/`: `excel_validator.py` and `json_validator.py` rules
- `common_entities.py`: column maps, type mappings, patterns, and `InvalidDataModelError`
- `error_reporting.py`: `client_error_message`, the bounded single-line rendering used in responses
- `tests/`: unit and endpoint coverage, mirroring the runtime modules, with `MinimalDataModelExample.json`,
  `MinimalDataModelExample.xlsx`, and `MinimalDataModelError.xlsx` fixtures
