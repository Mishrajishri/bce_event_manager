"""API routers package."""
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

__all__ = [
    "auth",
    "events",
    "events_teams",
    "teams",
    "matches",
    "registrations",
    "expenses",
    "announcements",
    "volunteers",
    "admin",
    "feedback",
    "certificates",
]
