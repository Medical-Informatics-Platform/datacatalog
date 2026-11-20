# Product

<!-- impeccable:product-schema 1 -->

> Inferred from the user's written brief (no interview answers beyond direction and stack). Marked facts are from the brief; open decisions are listed under Capabilities and Constraints.

## Platform

web

## Stack

Angular 22, standalone components, signals, D3 for hierarchy. Existing services, XSRF config and backend are reused. Dev loop: `ng serve` on :4200 proxying `/services/*` to the docker-compose backend on :8090.

## Users

- **Clinical and brain-health researchers** (public, anonymous): deciding which federated cohorts and which Common Data Elements (CDEs) exist before requesting access to any data. They arrive with a study design in mind and need to know quickly: does a federation cover my disease, how many patients and sites, which variables are collected, with what type, units, ranges and allowed values.
- **`DC_ADMIN`**: curates federations (create, edit, delete) and binds released data models to them.
- **`DC_DOMAIN_EXPERT`**: imports, updates (JSON or Excel), releases and deletes pathology data models; inspects drafts as well as released models.

## Product Purpose

The MIP Data Catalog is the public front door to Europe's federated clinical brain-health research networks (EBRAINS, CHUV, Athena Research Center). Hospital records cannot leave hospital premises (GDPR, privacy, national rules), so the catalog publishes metadata only, never patient-level data. Success: a researcher can discover federations, inspect a pathology's schema down to the variable, export it, and jump to the live MIP instance, without ever requesting data.

Short form: a library catalog and schema workbench for clinical data you are not allowed to move.

## Positioning

Not a data portal, since no data is served. It is a schema-level index of federated clinical cohorts: federation to pathology to group to variable, with the same CDE hierarchy the MIP analysis platform uses.

## Operating Context

- Anonymous read-only browsing is the primary case and must work with backend `AUTHENTICATION=0`.
- Authenticated roles come from Keycloak OIDC via the backend (`/services/oauth2/authorization/keycloak`, `/auth-callback?token=`, `/services/user`).
- Backend enforces CSRF on every profile (`MIP-XSRF-TOKEN` cookie, `X-MIP-XSRF-TOKEN` header); keep the XSRF config in `main.ts`.
- Data models can be large (Dementia: dozens of variables across Brain Anatomy, Demographics, Diagnosis, Genetic, Neuropsychology, PET, Proteome, Z-scores) and are hierarchical (groups, subgroups, variables).
- Backend validation errors and `409 Conflict` messages from the data quality tool must be surfaced to the user verbatim and legibly.

## Capabilities and Constraints

- Routes: `/` overview + federation directory + about; `/pathology` explorer (query params `federationCode`, `pathologyCode`, `latest=true`); `/account` (guarded); `/auth-callback`.
- Explorer: federation and pathology selectors (cross-sectional vs longitudinal grouping, version, Released/Draft badge for experts), JSON/XLSX export, hierarchy browser, variable/group inspector, search with kind and type filters.
- Variable fields: label, code, description, type, sql_type, isCategorical, enumerations, units, minValue, maxValue, methodology.
- Management flows use in-app dialogs/drawers, inline validation, toasts. Never `window.alert` / `window.confirm`.
- Constraints: do not modify `backend/`, `data_quality_tool/`, `compose.yaml`, `frontend/Dockerfile`, `frontend/nginx.conf`. Production bundle budget: initial 500kB warn / 1MB error; component CSS 4kB warn / 6kB error.
- Undecided: the real MIP platform screenshots (placeholders only for now); whether `Federation.institutions` / `records` stay strings in the API (interface types them as string, form treats as integers).

## Brand Commitments

- Official MIP palette `#2B33E9`, `#7F9CE8`, `#FFBA08`, `#DFEFE4` (see `frontend/src/DESIGN_SYSTEM.yaml`); approved logo/background combinations only, clear space around logo, never redraw or recolor logos. Brand text face is Alaska Regular (not freely available); logo face Mark Pro Bold is for the logo only.
- Partner marks in `frontend/src/assets/`: MIP logos, EBRAINS, Athena Research Center, CHUV, EU flag.
- Footer must carry: GitHub `https://github.com/Medical-Informatics-Platform/mip`, EBRAINS `https://www.ebrains.eu/tools/medical-informatics-platform`, support `mailto:mip@chuv.ch`, and funding acknowledgement (EU Horizon 2020 / Horizon Europe EBRAINS 2.0, grant No. 101147319; SERI contract No. 23.00638).
- Voice: refined European scientific/clinical research platform. Not generic SaaS marketing.

## Evidence on Hand

- Live data from `/services/federations` and `/services/datamodels` (real federations and CDE hierarchies).
- `frontend/src/assets/home/platform-screenshot.png` exists; the brief asks for placeholder slots for MIP platform previews instead, so do not present invented screenshots as real.
- No testimonials, usage numbers or citations are provided; do not invent any. Summary metrics must be computed from live API data.

## Product Principles

1. Metadata only, said plainly: never imply patient-level data is available here.
2. The schema is the product: the explorer must make a large CDE hierarchy navigable, searchable and exportable faster than reading a spreadsheet.
3. Deep links everywhere: federation, pathology and variable states are shareable URLs.
4. Truth from live data: counts and lists come from the API; loading, empty and error states are designed, not afterthoughts.
5. Role-gated actions appear only for those who may use them, and every destructive action is confirmed in-app.

## Accessibility & Inclusion

Keyboard operable throughout (including the hierarchy browser and dialogs), visible focus, high contrast, no colour-only meaning, responsive from phone to wide desktop, respects `prefers-reduced-motion`.
