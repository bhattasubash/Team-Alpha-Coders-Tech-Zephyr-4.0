"""Health check endpoint. First thing deployed, always available."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict:
    """Return a simple health status so deployment and monitoring can verify the app is alive."""
    return {"status": "ok", "version": "0.1.0"}
