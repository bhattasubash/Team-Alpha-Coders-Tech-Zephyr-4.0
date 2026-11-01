"""FastAPI application entry point.

Exposes /openapi.json, configures CORS from environment, and normalizes
all error responses to {"error": {"code": "...", "message": "...", "details": [...]}}.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
import os
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import router as api_router

# Read CORS origins from environment variable, comma-separated
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "https://team-alpha-coders-tech-zephyr-40.vercel.app",
]
cors_origins_env = os.getenv("CORS_ORIGINS", "")
extra_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
allow_origins = list(set(default_origins + extra_origins))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize SQLite database and seed initial dataset and schedule if empty."""
    from app.db.connection import get_connection
    from app.db.repository import get_active_schedule, reset_database
    from app.db.schema import init_db

    conn = get_connection()
    init_db(conn)
    if get_active_schedule(conn) is None:
        reset_database(conn)
    yield


app = FastAPI(
    title="CIT Campus Scheduling API",
    description="Scheduling, venue management, and constraint validation engine for Chilika Institute of Technology",
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$|^http://localhost:\d+$|^http://127\.0\.0\.1:\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotImplementedError)
async def not_implemented_handler(request: Request, exc: NotImplementedError) -> JSONResponse:
    """Handle unimplemented endpoints with HTTP 501 and standardized error envelope."""
    msg = str(exc) if str(exc) else "Endpoint not implemented yet."
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "error": {
                "code": "NOT_IMPLEMENTED",
                "message": msg,
                "details": [],
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Standardize Starlette and FastAPI HTTP exceptions into error envelope."""
    code = "ERROR"
    message = str(exc.detail)
    details: list[Any] = []

    if isinstance(exc.detail, dict):
        code = str(exc.detail.get("code", "ERROR"))
        message = str(exc.detail.get("message", str(exc.detail)))
        details = list(exc.detail.get("details", []))
    elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
        code = "UNAUTHENTICATED"
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        code = "FORBIDDEN"
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        code = "NOT_FOUND"
    elif exc.status_code == status.HTTP_501_NOT_IMPLEMENTED:
        code = "NOT_IMPLEMENTED"

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Standardize Pydantic validation errors into INVALID_INPUT error envelope."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "INVALID_INPUT",
                "message": "Request validation failed",
                "details": exc.errors(),
            }
        },
    )


app.include_router(api_router)
