# DataCatalog

DataCatalog is part of the [Medical Informatics Platform](https://mip.ebrains.eu/) under [EBRAINS](https://www.ebrains.eu/). It manages federations and data models, visualizes common data elements, and supports Excel and JSON import, export, and validation workflows.

## Repository Layout

- `frontend/`: Angular 22 application served locally on `http://localhost:4200` or through Nginx in Docker
- `backend/`: Spring Boot 4.1 (Java 21) API exposed on `http://localhost:8090/services`
- `data_quality_tool/`: Flask service (Python 3.12) for Excel and JSON conversion and validation on `http://localhost:8000`
- `compose.yaml`: local multi-service setup with PostgreSQL `18.6`
- `kubernetes/`: Helm chart and templates for cluster deployment
- `.github/workflows/`: data quality tool CI, image publishing with Docker Bake on release, and the EBRAINS GitLab mirror

## Quick Start With Docker Compose

### Prerequisites

- Docker with the Compose plugin

### Local Environment

Every variable used by `compose.yaml` has a safe local default, so the stack starts without any `.env` file. To pin values for your machine, copy `.env.example` to `.env` (`.env` is git-ignored) and edit the copy.

```env
FLASK_ENV=development
FLASK_DEBUG=1
MAX_UPLOAD_SIZE_MB=20

POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_PASSWORD=test

BACKEND_PORT=8090
DB_URL=jdbc:postgresql://datacatalogdb:5432/postgres
DB_USER=postgres
DB_PASSWORD=test
FRONTEND_PORT=80
PUBLIC_HOST=http://localhost
DQT_PORT=8000
DQT_URL=http://data_quality_tool:8000

AUTHENTICATION=0
KEYCLOAK_AUTH_URL=https://iam.ebrains.eu/auth/
KEYCLOAK_REALM=MIP
KEYCLOAK_CLIENT_ID=datacatalogue
KEYCLOAK_CLIENT_SECRET=change-me
KEYCLOAK_SSL_REQUIRED=none
```

`PUBLIC_HOST` becomes `app.frontend.base-url` in the backend container: the allowed CORS origin and
the Keycloak redirect target (`<PUBLIC_HOST>/auth-callback`). Set `PUBLIC_HOST=http://localhost:4200`
when the Angular app runs on the host instead of in the `frontend` container. Set `AUTHENTICATION=1`
only when valid Keycloak settings are available.

If port `80` is already in use on your machine, set `FRONTEND_PORT=8080` and update `PUBLIC_HOST=http://localhost:8080`.

### Start The Stack

```bash
docker compose up --build
```

The frontend is available at `http://localhost` (or your configured `FRONTEND_PORT`), the backend at `http://localhost:8090/services`, and the data quality tool at `http://localhost:8000`. PostgreSQL data is persisted under `.stored_data/datacatalogdb`.

Useful endpoints once the stack is up:

- Backend health: `http://localhost:8090/services/actuator/health`
- OpenAPI docs UI: `http://localhost:8090/services/swagger-ui/index.html`
- Data quality tool: `http://localhost:8000` (see [data_quality_tool/README.md](data_quality_tool/README.md) for the conversion and validation endpoints)

## Local Service Development

### Frontend

```bash
cd frontend
npm ci
npm start
```

Useful commands:

- `npm run build`: production bundle in `dist/datacatalog-frontend`
- `npm run watch`: continuous development build
- `npm test -- --watch=false --browsers=ChromeHeadless`: run Karma/Jasmine once

Angular CLI 22 requires Node `^22.22.3 || ^24.15.0 || >=26.0.0`. `src/proxy.conf.json` forwards
`/services` to `http://localhost:8090`, so the backend has to run on that port. More detail lives in
[frontend/README.md](frontend/README.md).

### Backend

The backend needs JDK `21` and Maven.

The `DB_URL`, `PUBLIC_HOST`, and `DQT_URL` variables are only read by the container image, which
ships `backend/config/application.yml` and lets Spring resolve its `${VAR:default}` placeholders.
`mvn spring-boot:run` uses
`backend/src/main/resources/application.yml` instead, and that file points at the Compose host names
(`datacatalogdb`, `data_quality_tool`). To run the service on the host against local PostgreSQL and
data quality tool, override the Spring properties:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.arguments="
--spring.datasource.url=jdbc:postgresql://localhost:5432/postgres
--spring.datasource.username=postgres
--spring.datasource.password=test
--spring.flyway.url=jdbc:postgresql://localhost:5432/postgres
--spring.flyway.user=postgres
--spring.flyway.password=test
--app.data_quality_tool.excel-to-json-url=http://localhost:8000/excel-to-json
--app.data_quality_tool.json-to-excel-url=http://localhost:8000/json-to-excel
--app.data_quality_tool.validate-json-url=http://localhost:8000/validate-json"
```

`application.yml` ships `authentication.enabled: 0`, matching the Compose default `AUTHENTICATION=0`,
so a host-local run does not need Keycloak; pass `--authentication.enabled=1` with a real
`spring.security.oauth2.client.registration.keycloak.client-secret` to exercise the login flow.
`app.frontend.base-url` and `app.frontend.auth-callback-url` already point at
`http://localhost:4200`, matching `npm start`.

Schema changes belong in Flyway migrations under `backend/src/main/resources/db/migration`; Hibernate
runs with `ddl-auto: validate`, so an entity change without a migration fails at startup.

Use `mvn test` to run backend tests.

State-changing requests are CSRF-protected in every profile, including `AUTHENTICATION=0`. The Angular
client copies the `MIP-XSRF-TOKEN` cookie into the `X-MIP-XSRF-TOKEN` header on its own; send that pair
by hand when calling `POST`, `PUT`, or `DELETE` endpoints with `curl` or Postman.

### Data Quality Tool

The service requires Python `3.12` (`pyproject.toml` pins `^3.12`) and Poetry 2.x.

```bash
cd data_quality_tool
poetry install --with dev
poetry run python controller.py
```

Use `poetry run pytest` for tests, `poetry run black .` for formatting, and
`poetry run gunicorn --bind 0.0.0.0:8000 controller:app` for a production-like server. Endpoints,
validation rules, and error-response behavior are documented in
[data_quality_tool/README.md](data_quality_tool/README.md).

## Roles

- `DC_DOMAIN_EXPERT`: create, update, delete, and release unreleased data models
- `DC_ADMIN`: create, update, and delete federations

Released data models are immutable: updates, deletes, and repeated releases are rejected.

Roles come from the Keycloak token (`realm_access.roles`, `resource_access.<client-id>.roles`,
`roles`, and `authorities` claims) and match with or without a `ROLE_` prefix. They only apply when
`AUTHENTICATION=1`: with authentication disabled every endpoint is reachable without a login, but the
role-gated ones still deny an anonymous caller.

## Kubernetes

Cluster deployment instructions live in [kubernetes/README.md](kubernetes/README.md).

## Images, CI, and Mirroring

- `.github/workflows/publish-images.yml` builds all three images with Docker Bake
  (`.github/workflows/docker-bake.hcl`) and pushes `hbpmip/datacatalog_backend`,
  `hbpmip/datacatalog_frontend`, and `hbpmip/datacatalog_data_quality_tool` on a published GitHub
  release; the tag is the release name without the leading `v`.
- `.github/workflows/data_quality_tool.yml` runs the data quality tool suite with `pytest` and
  uploads coverage to Codecov when `CODECOV_TOKEN` is configured.
- `.github/workflows/ebrains.yml` mirrors `master` and all tags to
  `gitlab.ebrains.eu/hbp-mip/datacatalog`.

The Helm chart pins all three images to a single `images.tag`.
