# Repository Guidelines

## Project Structure & Module Organization
- Service code lives in this directory.
- Python `^3.12` and Poetry 2.x; the image in `Dockerfile` uses `python:3.12.14-slim` and installs with `poetry install --without dev`.
- `controller.py` defines the Flask routes for conversion and validation plus the upload limit and error handlers.
- `converter/` contains Excel to JSON and JSON to Excel transformation logic.
- `validator/` contains JSON and Excel validation rules.
- `common_entities.py` stores shared constants, column and type maps, and `InvalidDataModelError`.
- `error_reporting.py` renders validator output for API responses through `client_error_message`.
- `tests/` mirrors runtime responsibilities (`excel_to_json/`, `json_to_excel/`, `validator/`) and includes API tests in `tests/test_endpoint.py` and `tests/test_error_reporting.py`, which use `app.test_client()`.
- Test fixtures are committed under `tests/`, for example `tests/MinimalDataModelExample.json`, `tests/MinimalDataModelExample.xlsx`, and `tests/MinimalDataModelError.xlsx`; `tests/` is excluded from the image by `.dockerignore`.

## Build, Test, and Development Commands
- `poetry install --with dev`: install runtime and development dependencies.
- `poetry run python controller.py`: run Flask locally on port `8000`.
- `poetry run gunicorn --bind 0.0.0.0:8000 controller:app`: run a production-like server.
- `poetry run pytest`: run the full test suite from the service root.
- `poetry run coverage run -m pytest && poetry run coverage xml`: what CI runs, with Codecov upload when `CODECOV_TOKEN` is set.
- `docker build -t data-quality-tool .`: build the container image; `docker buildx bake -f .github/workflows/docker-bake.hcl data_quality_tool` from the repository root builds the release image name.

## Coding Style & Naming Conventions
- Follow PEP 8 with 4-space indentation.
- Use `snake_case` for modules/functions/variables, `PascalCase` for classes, and `UPPER_SNAKE_CASE` for constants.
- Keep route handlers lightweight; place conversion and validation business logic in `converter/` or `validator/`.
- Client-facing validation text goes through `error_reporting.client_error_message`, so responses stay one bounded line and never carry a stack trace; unexpected failures are logged and answered with a generic 500.
- Keep the `# codeql[py/stack-trace-exposure]` markers on the same line as the value they cover, short enough that Black does not re-wrap them.
- Format code with Black before submitting changes: `poetry run black .`.

## Testing Guidelines
- Testing is run with `pytest`, with most tests written using `unittest.TestCase`.
- Name files `test_*.py`, classes `Test*`, and test methods `test_*`.
- Add tests in the matching `tests/` subdirectory when changing parser, validator, or API behavior.
- Cover both successful flows and explicit validation failures.

## Commit & Pull Request Guidelines
- Existing history uses short summaries and sometimes issue references like `(#9)`.
- Write concise imperative commit subjects and include an issue reference when applicable.
- PRs should include what changed, why it changed, and test evidence; include sample request or response details when endpoint behavior changes.

## Security & Configuration Tips
- Do not commit sensitive real-world data in JSON or XLSX fixtures.
- Never return raw exception text, tracebacks, or environment details to a caller; log them and answer with the bounded message from `client_error_message`.
- `MAX_UPLOAD_SIZE_MB` controls the upload limit; keep the `20` default aligned across `compose.yaml`, `kubernetes/values.yaml` (`dqt.maxUploadSizeMb`), the chart template, and docs if you change it.
- The service is an internal API for the backend; it has no authentication of its own, so call out any new exposure, route, or validation rule change clearly in PR descriptions.
