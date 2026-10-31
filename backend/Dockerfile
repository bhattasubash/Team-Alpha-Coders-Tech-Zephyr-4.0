# CIT Campus Scheduling Backend Dockerfile
# Python 3.13 slim, installs requirements, runs uvicorn on $PORT, with healthcheck

FROM python:3.13-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install curl for container HEALTHCHECK and git for version info
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application and project data
COPY backend/app ./app
COPY backend/pyproject.toml ./pyproject.toml
COPY data ./data
COPY exports ./exports
COPY docs ./docs
COPY validator ./validator

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
