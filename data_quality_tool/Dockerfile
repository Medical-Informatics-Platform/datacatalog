FROM python:3.12.14-slim

WORKDIR /app
COPY . .

# Install Poetry
RUN pip install "poetry>=2.4,<3.0"

# Disable virtualenvs
RUN poetry config virtualenvs.create false

# Install project dependencies
RUN poetry install --without dev

RUN useradd --create-home --uid 1001 appuser
USER appuser

EXPOSE 8000

ENV MODULE_NAME=data_quality_tool.controller
ENV VARIABLE_NAME=app
ENV PORT=8000

CMD ["sh", "-c", "poetry run gunicorn --bind 0.0.0.0:${PORT} controller:app"]
