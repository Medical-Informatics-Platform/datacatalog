# Repository Guidelines

## Project Structure & Module Organization
- Core backend code lives at the repository root.
- `controller.py` defines Flask API routes for conversion and validation.
- `converter/` contains Excel <-> JSON transformation logic.
- `validator/` contains JSON and Excel validation rules.
- `common_entities.py` stores shared constants/exceptions used across modules.
- `tests/` mirrors runtime responsibilities (`excel_to_json/`, `json_to_excel/`, `validator/`) and includes API tests in `tests/test_endpoint.py`.
- Test fixtures are in `tests/` (for example `tests/MinimalDataModelExample.json` and `tests/MinimalDataModelExample.xlsx`).

## Build, Test, and Development Commands
- `poetry install --with dev`: install runtime and development dependencies.
- `poetry run python controller.py`: run Flask locally on port `8000`.
- `poetry run gunicorn --bind 0.0.0.0:8000 controller:app`: run a production-like server.
- `cd tests && poetry run pytest -q`: run the full test suite (run from `tests/` so fixture paths resolve correctly).
- `docker build -t data-quality-tool .`: build backend container image.

## Coding Style & Naming Conventions
- Follow PEP 8 with 4-space indentation.
- Use `snake_case` for modules/functions/variables, `PascalCase` for classes, and `UPPER_SNAKE_CASE` for constants.
- Keep route handlers lightweight; place conversion/validation business logic in `converter/` or `validator/`.
- Format code with Black before submitting changes: `poetry run black .`.

## Testing Guidelines
- Testing is run with `pytest`, with most tests written using `unittest.TestCase`.
- Name files `test_*.py`, classes `Test*`, and test methods `test_*`.
- Add tests in the matching `tests/` subdirectory when changing parser, validator, or API behavior.
- Cover both successful flows and explicit validation failures.

## Commit & Pull Request Guidelines
- Existing history uses short, sentence-style summaries and sometimes issue references like `(#9)`.
- Write concise imperative commit subjects and include an issue reference when applicable.
- PRs should include: what changed, why it changed, test evidence, and sample request/response when endpoint behavior is affected.

## Security & Configuration Tips
- Do not commit sensitive real-world data in JSON/XLSX fixtures.
- Call out any authentication or API exposure changes clearly in PR descriptions.
