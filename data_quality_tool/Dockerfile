# Resolve the locked runtime dependencies into a virtualenv. Poetry stays in
# this stage, so neither it nor pip ends up in the image that runs.
# Base images are pinned by digest; Dependabot bumps the digest when the tag is rebuilt.
FROM python:3.16.0a1-alpine@sha256:57d59f9badcd47eabb3ed920d3bd5ae02f44664fc224ae57f1687980227741d2 AS build
WORKDIR /app
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_VIRTUALENVS_OPTIONS_NO_PIP=true
RUN pip install --no-cache-dir "poetry==2.5.1"
COPY pyproject.toml poetry.lock ./
RUN poetry install --without dev --no-root

FROM python:3.16.0a1-alpine@sha256:57d59f9badcd47eabb3ed920d3bd5ae02f44664fc224ae57f1687980227741d2
WORKDIR /app
# 3.15.2-alpine still ships zlib 1.3.2-r1 (CVE-2026-4738, fixed in 1.4-r0).
# musl in this tag is already 1.2.6-r3; upgrading it by name keeps that fix if
# a later digest lags. Versions stay unpinned so Alpine's next revision installs.
# The interpreter's own pip and the pip wheel bundled for ensurepip are not
# needed to run the service, and both carry vendored packages behind their fixes.
# hadolint ignore=DL3018
RUN apk add --no-cache --upgrade zlib musl musl-utils \
    && pip uninstall -y pip \
    && rm -rf /usr/local/lib/python*/ensurepip/_bundled \
    && adduser -D -u 1001 appuser
COPY --from=build /app/.venv /app/.venv
COPY . .
USER 1001

# gunicorn binds to 0.0.0.0:$PORT when PORT is set
ENV PATH="/app/.venv/bin:$PATH" \
    PORT=8000
EXPOSE 8000
CMD ["gunicorn", "controller:app"]
