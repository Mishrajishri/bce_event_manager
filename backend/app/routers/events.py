"""Events API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.models import (
    EventCreate,
    EventUpdate,
    EventResponse,
    EventStatus,
    EventType,
    EventAnalytics,
)
from app.auth import CurrentUser, get_current_user, get_current_user_optional, require_organizer
from app.supabase import supabase_admin

# Indian Standard Time (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))
from datetime import datetime, timezone, timedelta


router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/", response_model=List[EventResponse])
async def list_events(
    status: Optional[EventStatus] = None,
    event_type: Optional[EventType] = None,
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    List all events with optional filters.
    
    Args:
        status: Filter by event status
        event_type: Filter by event type
        search: Search in name and description
        limit: Maximum number of results
        offset: Number of results to skip
        current_user: Optional authenticated user
        
    Returns:
        List[EventResponse]: List of events
    """
    query = supabase_admin.table("events").select("*")
    
    # Only show published/completed events to non-organizers
    if current_user is None or current_user.role not in ["admin", "organizer"]:
        query = query.in_("status", [EventStatus.PUBLISHED.value, EventStatus.COMPLETED.value])
    elif status:
        query = query.eq("status", status.value)
    
    if event_type:
        query = query.eq("event_type", event_type.value)
    
    if search:
        # Escape special characters to prevent SQL injection
        search_escaped = search.replace('%', r'\%').replace('_', r'\_')
        query = query.or_(f"name.ilike.%{search_escaped}%,description.ilike.%{search_escaped}%")
    
    query = query.order("start_date", desc=True).range(offset, offset + limit - 1)
    
    response = query.execute()
    
    return [EventResponse(**item) for item in response.data]


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Create a new event.
    
    Args:
        event_data: Event creation data
        current_user: Current authenticated organizer
        
    Returns:
        EventResponse: Created event
    """
    try:
        data = event_data.model_dump()
        data["organizer_id"] = current_user.user_id
        data["status"] = EventStatus.DRAFT.value
        
        response = supabase_admin.table("events").insert(data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create event"
            )
        
        return EventResponse(**response.data[0])
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create event: {str(e)}"
        )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    Get event by ID.
    
    Args:
        event_id: Event ID
        current_user: Optional authenticated user
        
    Returns:
        EventResponse: Event details
        
    Raises:
        HTTPException: If event not found
    """
    response = supabase_admin.table("events").select("*").eq("id", event_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Check access for non-published events
    event = response.data[0]
    if event["status"] != EventStatus.PUBLISHED.value:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        if current_user.role not in ["admin", "organizer"] and event["organizer_id"] != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
    
    return EventResponse(**event)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_data: EventUpdate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Update an event.
    
    Args:
        event_id: Event ID
        event_data: Event update data
        current_user: Current authenticated organizer
        
    Returns:
        EventResponse: Updated event
        
    Raises:
        HTTPException: If event not found or access denied
    """
    # Check if event exists and user has permission
    event_response = supabase_admin.table("events").select("*").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    # Only organizer who created the event or admin can update
    if current_user.role != "admin" and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this event"
        )
    
    # Update event
    update_data = {k: v for k, v in event_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(IST).isoformat()
    
    response = supabase_admin.table("events").update(update_data).eq("id", event_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update event"
        )
    
    return EventResponse(**response.data[0])


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Delete an event.
    
    Args:
        event_id: Event ID
        current_user: Current authenticated organizer
        
    Raises:
        HTTPException: If event not found or access denied
    """
    # Check if event exists and user has permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    # Only organizer who created the event or admin can delete
    if current_user.role != "admin" and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this event"
        )
    
    # Delete event (cascades to related records)
    supabase_admin.table("events").delete().eq("id", event_id).execute()


@router.get("/{event_id}/analytics", response_model=EventAnalytics)
async def get_event_analytics(
    event_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Get analytics for an event.
    
    Args:
        event_id: Event ID
        current_user: Current authenticated organizer
        
    Returns:
        EventAnalytics: Event analytics data
        
    Raises:
        HTTPException: If event not found or access denied
    """
    # Check if event exists and user has permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if current_user.role != "admin" and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view analytics for this event"
        )
    
    # Get registration stats
    reg_response = supabase_admin.table("registrations").select("*").eq("event_id", event_id).execute()
    registrations = reg_response.data
    
    total_registrations = len(registrations)
    confirmed_registrations = len([r for r in registrations if r.get("status") == "confirmed"])
    pending_registrations = len([r for r in registrations if r.get("status") == "pending"])
    
    # Get team stats
    team_response = supabase_admin.table("teams").select("id").eq("event_id", event_id).execute()
    total_teams = len(team_response.data)
    
    # Get match stats
    match_response = supabase_admin.table("matches").select("id, status").eq("event_id", event_id).execute()
    total_matches = len(match_response.data)
    completed_matches = len([m for m in match_response.data if m.get("status") == "completed"])
    
    # Get financial stats
    reg_response = supabase_admin.table("registrations").select("payment_amount").eq("event_id", event_id).eq("payment_status", "paid").execute()
    total_revenue = sum(r.get("payment_amount", 0) for r in reg_response.data)
    
    expense_response = supabase_admin.table("expenses").select("amount").eq("event_id", event_id).execute()
    total_expenses = sum(e.get("amount", 0) for e in expense_response.data)
    
    # Generate registration timeline (last 7 days)
    registration_timeline = []
    for i in range(7):
        date = datetime.now(IST).date()
        date = date.replace(day=date.day - i)
        count = len([r for r in registrations if r.get("registered_at", "").startswith(str(date))])
        registration_timeline.append({"date": str(date), "count": count})
    
    # Demographics placeholder
    demographics = [{"category": "Total", "count": total_registrations}]
    
    return EventAnalytics(
        total_registrations=total_registrations,
        confirmed_registrations=confirmed_registrations,
        pending_registrations=pending_registrations,
        total_teams=total_teams,
        total_matches=total_matches,
        completed_matches=completed_matches,
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net_profit=total_revenue - total_expenses,
        registration_timeline=registration_timeline,
        demographics=demographics,
    )
