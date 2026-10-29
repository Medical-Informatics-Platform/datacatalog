FROM python:3.12.15-slim

WORKDIR /app
COPY . .

# Patch OS packages and pip shipped in the base image
RUN apt-get update && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip

# Install Poetry
RUN pip install "poetry>=2.4,<3.0"

# Disable virtualenvs
RUN poetry config virtualenvs.create false

# Install project dependencies, then remove pip: nothing runs it after this
# point, and its vendored msgpack, urllib3 and setuptools trail their fixes
RUN poetry install --without dev \
    && pip uninstall -y pip

RUN useradd --create-home --uid 1001 appuser
USER appuser

EXPOSE 8000

ENV MODULE_NAME=data_quality_tool.controller
ENV VARIABLE_NAME=app
ENV PORT=8000

CMD ["sh", "-c", "poetry run gunicorn --bind 0.0.0.0:${PORT} controller:app"]
