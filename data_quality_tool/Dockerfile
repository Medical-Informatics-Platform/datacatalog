# Resolve the locked runtime dependencies into a virtualenv. Poetry stays in
# this stage, so neither it nor pip ends up in the image that runs.
# Base images are pinned by digest; Dependabot bumps the digest when the tag is rebuilt.
FROM python:3.12.15-alpine@sha256:b658b05ce9c4eb97ec6fc19424818a1f31993659c2b505a532f470e83807815d AS build
WORKDIR /app
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_VIRTUALENVS_OPTIONS_NO_PIP=true
RUN pip install --no-cache-dir "poetry==2.5.1"
COPY pyproject.toml poetry.lock ./
RUN poetry install --without dev --no-root

FROM python:3.12.15-alpine@sha256:b658b05ce9c4eb97ec6fc19424818a1f31993659c2b505a532f470e83807815d
WORKDIR /app
# The interpreter's own pip and the pip wheel bundled for ensurepip are not
# needed to run the service, and both carry vendored packages behind their fixes
RUN pip uninstall -y pip \
    && rm -rf /usr/local/lib/python3.12/ensurepip/_bundled \
    && adduser -D -u 1001 appuser
COPY --from=build /app/.venv /app/.venv
COPY . .
USER 1001

# gunicorn binds to 0.0.0.0:$PORT when PORT is set
ENV PATH="/app/.venv/bin:$PATH" \
    PORT=8000
EXPOSE 8000
CMD ["gunicorn", "controller:app"]
