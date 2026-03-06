# DataCatalog

DataCatalog is part of the [Medical Informatics Platform](https://mip.ebrains.eu/) under [EBRAINS](https://www.ebrains.eu/). It manages federations and data models, visualizes common data elements, and supports Excel and JSON import, export, and validation workflows.

## Repository Layout

- `frontend/`: Angular 21 application served locally on `http://localhost:4200` or through Nginx in Docker
- `backend/`: Spring Boot API exposed on `http://localhost:8090/services`
- `data_quality_tool/`: Flask service for Excel and JSON conversion and validation on `http://localhost:8000`
- `compose.yaml`: local multi-service setup with PostgreSQL `18.3`
- `kubernetes/`: Helm chart and templates for cluster deployment

## Quick Start With Docker Compose

### Prerequisites

- Docker with the Compose plugin

### Local Environment

Create a `.env` file in the repository root:

```env
FLASK_ENV=development
FLASK_DEBUG=1
POSTGRES_PASSWORD=test

DB_URL=jdbc:postgresql://datacatalogdb:5432/postgres
DB_USER=postgres
DB_PASSWORD=test
PUBLIC_HOST=http://localhost
DQT_URL=http://data_quality_tool:8000

AUTHENTICATION=0
KEYCLOAK_AUTH_URL=https://iam.ebrains.eu/auth/
KEYCLOAK_REALM=MIP
KEYCLOAK_CLIENT_ID=datacatalog
KEYCLOAK_CLIENT_SECRET=change-me
KEYCLOAK_SSL_REQUIRED=none
```

Set `PUBLIC_HOST=http://localhost:4200` if you run the Angular frontend outside Docker. Set `AUTHENTICATION=1` only when valid Keycloak settings are available.

### Start The Stack

```bash
docker compose up --build
```

The frontend is available at `http://localhost`, the backend at `http://localhost:8090/services`, and the data quality tool at `http://localhost:8000`. PostgreSQL data is persisted under `.stored_data/datacatalogdb`.

## Local Service Development

### Frontend

```bash
cd frontend
npm ci
npm start
```

Useful commands:

- `npm run build`
- `npm test -- --watch=false --browsers=ChromeHeadless`

### Backend

```bash
cd backend
DB_URL=jdbc:postgresql://localhost:5432/postgres \
PUBLIC_HOST=http://localhost:4200 \
DQT_URL=http://localhost:8000 \
mvn spring-boot:run
```

Use `mvn test` to run backend tests.

### Data Quality Tool

```bash
cd data_quality_tool
poetry install --with dev
poetry run python controller.py
```

Use `poetry run pytest` for tests and `poetry run black .` for formatting.

## Roles

- `DC_DOMAIN_EXPERT`: create, update, delete, and release unreleased data models
- `DC_ADMIN`: manage federations

Released data models are immutable.

## Kubernetes

Cluster deployment instructions live in [kubernetes/README.md](kubernetes/README.md).
