"""Volunteers and Shifts API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.models import (
    VolunteerCreate,
    VolunteerResponse,
    VolunteerStatus,
    ShiftCreate,
    ShiftResponse,
)
from app.auth import CurrentUser, get_current_user, require_any_user, require_organizer, get_current_user_optional
from app.supabase import supabase_admin


router = APIRouter(prefix="/events/{event_id}", tags=["Volunteers"])


# Shifts Routes
@router.get("/shifts", response_model=List[ShiftResponse])
async def list_shifts(
    event_id: str,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    List all shifts for an event.
    
    Args:
        event_id: Event ID
        current_user: Optional authenticated user
        
    Returns:
        List[ShiftResponse]: List of shifts
    """
    # Verify event exists
    event_response = supabase_admin.table("events").select("id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    response = supabase_admin.table("shifts").select("*").eq("event_id", event_id).order("start_time").execute()
    
    return [ShiftResponse(**item) for item in response.data]


@router.post("/shifts", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def create_shift(
    event_id: str,
    shift_data: ShiftCreate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Create a new shift (organizer only).
    
    Args:
        event_id: Event ID
        shift_data: Shift creation data
        current_user: Current authenticated user
        
    Returns:
        ShiftResponse: Created shift
        
    Raises:
        HTTPException: If event not found or access denied
    """
    # Verify event exists and user has permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if current_user.role not in ["super_admin", "admin", "organizer"] and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create shifts for this event"
        )
    
    # Create shift
    data = shift_data.model_dump()
    data["event_id"] = event_id
    
    response = supabase_admin.table("shifts").insert(data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create shift"
        )
    
    return ShiftResponse(**response.data[0])


# Volunteers Routes
@router.get("/volunteers", response_model=List[VolunteerResponse])
async def list_volunteers(
    event_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    List all volunteers for an event (organizer only).
    
    Args:
        event_id: Event ID
        current_user: Current authenticated user
        
    Returns:
        List[VolunteerResponse]: List of volunteers
        
    Raises:
        HTTPException: If event not found or access denied
    """
    # Verify event exists and user has permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if current_user.role not in ["super_admin", "admin", "organizer"] and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view volunteers for this event"
        )
    
    response = supabase_admin.table("volunteers").select("*").eq("event_id", event_id).order("created_at", desc=True).execute()
    
    return [VolunteerResponse(**item) for item in response.data]


@router.post("/shifts/{shift_id}/assign", response_model=VolunteerResponse, status_code=status.HTTP_201_CREATED)
async def assign_to_shift(
    event_id: str,
    shift_id: str,
    volunteer_data: VolunteerCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """
    Assign current user to a shift.
    
    Args:
        event_id: Event ID
        shift_id: Shift ID
        volunteer_data: Volunteer data
        current_user: Current authenticated user
        
    Returns:
        VolunteerResponse: Created volunteer record
        
    Raises:
        HTTPException: If event or shift not found
    """
    # Verify event exists
    event_response = supabase_admin.table("events").select("id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Verify shift exists
    shift_response = supabase_admin.table("shifts").select("*").eq("id", shift_id).eq("event_id", event_id).execute()
    
    if not shift_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    # Check if already assigned
    existing = supabase_admin.table("volunteers").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).execute()
    
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already assigned to a shift for this event"
        )
    
    # Create volunteer record
    data = {
        "user_id": current_user.user_id,
        "event_id": event_id,
        "shift_id": shift_id,
        "role": volunteer_data.role,
        "status": VolunteerStatus.ASSIGNED.value,
    }
    
    response = supabase_admin.table("volunteers").insert(data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to assign to shift"
        )
    
    return VolunteerResponse(**response.data[0])
