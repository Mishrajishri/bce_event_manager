"""FastAPI main application."""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import traceback

from pythonjsonlogger.jsonlogger import JsonFormatter

from app.config import settings
from app.routers import (
    auth,
    events,
    events_teams,
    teams,
    matches,
    registrations,
    expenses,
    announcements,
    volunteers,
    admin,
    feedback,
    certificates,
)

# Configure structured JSON logging
log_handler = logging.StreamHandler()
log_handler.setFormatter(JsonFormatter(
    fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
    rename_fields={"asctime": "timestamp", "levelname": "level"},
))

logging.basicConfig(
    level=logging.DEBUG if settings.app_debug else logging.INFO,
    handlers=[log_handler],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting BCE Event Manager API...",
                extra={"environment": settings.app_env})
    yield
    # Shutdown
    logger.info("Shutting down BCE Event Manager API...")


# Create FastAPI application
app = FastAPI(
    title="BCE Event Manager API",
    description="Comprehensive event management platform for sports, tech fests, and more",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Centralized Error Handling (B1)
# ---------------------------------------------------------------------------

def _error_response(status_code: int, message: str) -> JSONResponse:
    """Build a consistent error envelope."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": status_code,
                "message": message,
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic / request‐body validation errors."""
    errors = exc.errors()
    messages = "; ".join(
        f"{'.'.join(str(loc_item) for loc_item in e['loc'])}: {e['msg']}" for e in errors
    )
    logger.warning("Validation error", extra={"path": str(request.url), "errors": errors})
    return _error_response(status.HTTP_422_UNPROCESSABLE_ENTITY, messages)


from fastapi import HTTPException  # noqa: E402


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle all HTTPException responses with a consistent shape."""
    if exc.status_code >= 500:
        logger.error("HTTP error", extra={
            "path": str(request.url),
            "status": exc.status_code,
            "detail": exc.detail,
        })
    return _error_response(exc.status_code, exc.detail)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch‐all for unexpected server errors."""
    logger.error(
        "Unhandled exception",
        extra={
            "path": str(request.url),
            "traceback": traceback.format_exc(),
        },
    )
    return _error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "An internal server error occurred. Please try again later.",
    )


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(events_teams.router, prefix="/api")
app.include_router(matches.router, prefix="/api")
app.include_router(registrations.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(announcements.router, prefix="/api")
app.include_router(volunteers.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(certificates.router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to BCE Event Manager API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.app_env,
    }
