# Repository Guidelines

## Project Structure & Module Organization
- Service code lives in this directory.
- `controller.py` defines the Flask routes for conversion and validation.
- `converter/` contains Excel to JSON and JSON to Excel transformation logic.
- `validator/` contains JSON and Excel validation rules.
- `common_entities.py` stores shared constants and exceptions.
- `tests/` mirrors runtime responsibilities (`excel_to_json/`, `json_to_excel/`, `validator/`) and includes API tests in `tests/test_endpoint.py`.
- Test fixtures are committed under `tests/`, for example `tests/MinimalDataModelExample.json` and `tests/MinimalDataModelExample.xlsx`.

## Build, Test, and Development Commands
- `poetry install --with dev`: install runtime and development dependencies.
- `poetry run python controller.py`: run Flask locally on port `8000`.
- `poetry run gunicorn --bind 0.0.0.0:8000 controller:app`: run a production-like server.
- `poetry run pytest`: run the full test suite from the service root.
- `docker build -t data-quality-tool .`: build the container image.

## Coding Style & Naming Conventions
- Follow PEP 8 with 4-space indentation.
- Use `snake_case` for modules/functions/variables, `PascalCase` for classes, and `UPPER_SNAKE_CASE` for constants.
- Keep route handlers lightweight; place conversion and validation business logic in `converter/` or `validator/`.
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
- `MAX_UPLOAD_SIZE_MB` controls the upload limit; keep defaults and docs aligned if you change it.
- Call out API exposure or validation rule changes clearly in PR descriptions.
