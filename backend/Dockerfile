FROM python:3.13-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock* ./

RUN uv sync --frozen

COPY . .

RUN uv run python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "backend.asgi:application", "--host", "0.0.0.0", "--port", "8000"]

