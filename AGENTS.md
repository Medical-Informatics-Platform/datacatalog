# Repository Guidelines

## Project Structure & Module Organization
This repository is split by service. `frontend/` contains the Angular 21 UI; application code lives in `frontend/src/app`, assets in `frontend/src/assets`, and specs next to components as `*.spec.ts`. `backend/` is the Spring Boot service with sources in `backend/src/main/java/ebrainsv2/mip/datacatalog`, config in `backend/src/main/resources`, and tests in `backend/src/test/java`. `data_quality_tool/` is a Flask service for Excel and JSON conversion and validation. Root-level `compose.yaml` starts the local stack, and `kubernetes/` contains the Helm chart.

## Build, Test, and Development Commands
Run the full stack from the repository root with `docker compose up --build`. For frontend-only work: `cd frontend && npm ci && npm start`; use `npm run build` for a production bundle and `npm test -- --watch=false --browsers=ChromeHeadless` for CI-style tests. For backend work: `cd backend && mvn test` or `mvn spring-boot:run`; when running outside Docker, override `DB_URL`, `PUBLIC_HOST`, and `DQT_URL` for host-local services. For the data quality tool: `cd data_quality_tool && poetry install --with dev`, then `poetry run python controller.py`, `poetry run pytest`, and `poetry run black .`.

## Coding Style & Naming Conventions
Follow `frontend/.editorconfig`: UTF-8, spaces, 2-space indentation, and single quotes in TypeScript. Keep Angular naming consistent with the existing tree, for example `header.component.ts`, `auth.service.ts`, and `user.interface.ts`. In Java, keep package names lowercase, classes in PascalCase, and methods and fields in camelCase. Place backend code in the matching domain package such as `datamodel`, `federation`, or `user`. Python code should stay `black`-formatted and use snake_case for modules, functions, and tests.

## Testing Guidelines
Add tests with every behavior change. Frontend tests belong beside the component or service they cover and should follow the `*.spec.ts` pattern. Backend tests use JUnit under `backend/src/test/java`; prefer focused coverage for converters, validators, and service logic. Python tests live in `data_quality_tool/tests` and should cover both happy paths and malformed Excel or JSON inputs. No coverage gate is enforced, so reviewers will expect targeted regression tests in changed areas.

## Commit & Pull Request Guidelines
Recent history favors short, prefixed subjects such as `feat: ...`, `Fix: ...`, and `chore(scope): ...`; keep commits imperative and scoped to one change. Pull requests should summarize the affected module, list the commands you ran, and link the issue or ticket when available. Include screenshots for frontend UI changes and call out any `.env`, Keycloak, Docker, or Helm impact.

## Configuration Tips
Keep local secrets in `.env` and Kubernetes secrets, never in tracked files. Do not commit generated frontend output from `frontend/dist/` or local Postgres data under `.stored_data/`. When changing database image versions or mount paths, update `compose.yaml` and the Helm files together so local and cluster deployments stay aligned.
