"""FastAPI main application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

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
)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.app_debug else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting BCE Event Manager API...")
    logger.info(f"Environment: {settings.app_env}")
    logger.debug(f"Supabase URL: {settings.supabase_url[:30]}...")
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

# Configure CORS - restrict to specific methods and headers for security
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
