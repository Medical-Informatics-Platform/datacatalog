FROM python:3.9-slim

WORKDIR /app
COPY . .

# Install Poetry
RUN pip install "poetry<2.0"

# 🔧 Pin packaging to a version known to work with older tools
RUN pip install "packaging<24"

# Disable virtualenvs
RUN poetry config virtualenvs.create false

# Install project dependencies
RUN poetry install --without dev

EXPOSE 8000

ENV MODULE_NAME=data_quality_tool.controller
ENV VARIABLE_NAME=app
ENV PORT=8000

CMD ["sh", "-c", "poetry run gunicorn --bind 0.0.0.0:${PORT} controller:app"]
