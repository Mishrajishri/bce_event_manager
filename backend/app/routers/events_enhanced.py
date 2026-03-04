"""Events Enhanced Router - Extended event filtering and features."""
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import os

from ..models.schemas import EventResponse, EventStatus, EventType
from ...auth import CurrentUser, get_current_user_optional
from ...supabase import supabase_admin

router = APIRouter(prefix="/events-enhanced", tags=["Events Enhanced"])


@router.get("/filter", response_model=List[EventResponse])
async def filter_events(
    status: Optional[EventStatus] = None,
    event_type: Optional[EventType] = None,
    search: Optional[str] = None,
    category: Optional[str] = None,
    upcoming: bool = False,
    ongoing: bool = False,
    has_open_registrations: bool = False,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    Advanced event filtering with additional options.
    
    Args:
        status: Filter by event status
        event_type: Filter by event type (hackathon, coding_competition, etc.)
        search: Search in name and description
        category: Filter by category
        upcoming: Filter for events that haven't started yet
        ongoing: Filter for events that are currently happening
        has_open_registrations: Filter for events with open registrations
        limit: Maximum number of results
        offset: Number of results to skip
        current_user: Optional authenticated user
    
    Returns:
        List[EventResponse]: Filtered list of events
    """
    EVENT_LIST_COLUMNS = (
        "id, name, description, event_type, category, status, venue, "
        "start_date, end_date, max_participants, organizer_id, created_at"
    )
    
    query = supabase_admin.table("events").select(EVENT_LIST_COLUMNS)
    
    # Only show published/completed events to non-organizers
    if current_user is None or current_user.role not in ("super_admin", "admin", "organizer"):
        query = query.in_("status", [EventStatus.PUBLISHED.value, EventStatus.COMPLETED.value])
    elif status:
        query = query.eq("status", status.value)
    
    if event_type:
        query = query.eq("event_type", event_type.value)
    
    if category:
        query = query.eq("category", category)
    
    if search:
        search_sanitized = search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        query = query.or_(f"name.ilike.%{search_sanitized}%,description.ilike.%{search_sanitized}%")
    
    # Date-based filters
    now = datetime.now(timezone.utc).isoformat()
    
    if upcoming:
        query = query.gt("start_date", now)
    elif ongoing:
        query = query.lt("start_date", now).gt("end_date", now)
    
    if has_open_registrations:
        query = query.eq("registrations_open", True)
    
    query = query.order("start_date", desc=True).range(offset, offset + limit - 1)
    
    response = query.execute()
    
    return [EventResponse(**item) for item in response.data]


@router.get("/categories")
async def get_event_categories(
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """Get all unique event categories."""
    query = supabase_admin.table("events").select("category")
    
    if current_user is None or current_user.role not in ("super_admin", "admin", "organizer"):
        query = query.eq("status", EventStatus.PUBLISHED.value)
    
    response = query.execute()
    
    # Extract unique categories
    categories = set()
    for item in response.data:
        if item.get("category"):
            categories.add(item["category"])
    
    return {"categories": sorted(list(categories))}


@router.get("/upcoming", response_model=List[EventResponse])
async def get_upcoming_events(
    event_type: Optional[EventType] = None,
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """Get upcoming events (events that haven't started yet)."""
    EVENT_LIST_COLUMNS = (
        "id, name, description, event_type, category, status, venue, "
        "start_date, end_date, max_participants, organizer_id, created_at"
    )
    
    now = datetime.now(timezone.utc).isoformat()
    
    query = supabase_admin.table("events").select(EVENT_LIST_COLUMNS).gt("start_date", now)
    
    if current_user is None or current_user.role not in ("super_admin", "admin", "organizer"):
        query = query.eq("status", EventStatus.PUBLISHED.value)
    
    if event_type:
        query = query.eq("event_type", event_type.value)
    
    query = query.order("start_date", asc=True).limit(limit)
    
    response = query.execute()
    
    return [EventResponse(**item) for item in response.data]


@router.get("/hackathons", response_model=List[EventResponse])
async def get_hackathons(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """Get all hackathon events."""
    EVENT_LIST_COLUMNS = (
        "id, name, description, event_type, category, status, venue, "
        "start_date, end_date, max_participants, organizer_id, created_at"
    )
    
    query = supabase_admin.table("events").select(EVENT_LIST_COLUMNS).eq("event_type", "hackathon")
    
    if current_user is None or current_user.role not in ("super_admin", "admin", "organizer"):
        query = query.eq("status", EventStatus.PUBLISHED.value)
    
    query = query.order("start_date", desc=True).range(offset, offset + limit - 1)
    
    response = query.execute()
    
    return [EventResponse(**item) for item in response.data]


@router.get("/coding-competitions", response_model=List[EventResponse])
async def get_coding_competitions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """Get all coding competition events."""
    EVENT_LIST_COLUMNS = (
        "id, name, description, event_type, category, status, venue, "
        "start_date, end_date, max_participants, organizer_id, created_at"
    )
    
    query = supabase_admin.table("events").select(EVENT_LIST_COLUMNS).eq("event_type", "coding_competition")
    
    if current_user is None or current_user.role not in ("super_admin", "admin", "organizer"):
        query = query.eq("status", EventStatus.PUBLISHED.value)
    
    query = query.order("start_date", desc=True).range(offset, offset + limit - 1)
    
    response = query.execute()
    
    return [EventResponse(**item) for item in response.data]
