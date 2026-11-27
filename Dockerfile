
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY . .

ENV UV_DYNAMIC_VERSIONING_BYPASS=2.3.1.dev20+77001c96

RUN uv sync --frozen \
    && uv pip install --python .venv/bin/python \
       fastapi itsdangerous groq requests python-dotenv uvicorn

EXPOSE 8000

CMD [".venv/bin/python", "-m", "uvicorn", "auth:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
