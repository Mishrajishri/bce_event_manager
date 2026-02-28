"""Registrations API routes."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional

# Indian Standard Time (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))
from app.models import (
    RegistrationCreate,
    RegistrationUpdate,
    RegistrationResponse,
    RegistrationStatus,
    PaymentStatus,
)
from app.auth import CurrentUser, get_current_user, require_any_user
from app.supabase import supabase_admin


router = APIRouter(tags=["Registrations"])


@router.post("/events/{event_id}/register", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_for_event(
    event_id: str,
    reg_data: RegistrationCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """
    Register for an event.
    
    Args:
        event_id: Event ID
        reg_data: Registration data
        current_user: Current authenticated user
        
    Returns:
        RegistrationResponse: Created registration
        
    Raises:
        HTTPException: If event not found or already registered
    """
    # Verify event exists
    event_response = supabase_admin.table("events").select("*").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    # Check if event is open for registration
    if event["status"] not in ["draft", "published"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is closed for this event"
        )
    
    # Check if registration deadline has passed
    registration_deadline = event.get("registration_deadline")
    if registration_deadline:
        # Handle both string and datetime formats
        if isinstance(registration_deadline, str):
            deadline_dt = datetime.fromisoformat(registration_deadline.replace('Z', '+00:00'))
        else:
            deadline_dt = registration_deadline
        # Convert to IST (Asia/Kolkata) for comparison
        deadline_ist = deadline_dt.astimezone(IST) if deadline_dt.tzinfo else deadline_dt.replace(tzinfo=IST)
        now_ist = datetime.now(IST)
        if now_ist > deadline_ist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration deadline has passed"
            )
    
    # Check if already registered
    existing = supabase_admin.table("registrations").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).execute()
    
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already registered for this event"
        )
    
    # Check if event is full
    current_count = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).eq("status", "confirmed").execute()
    
    if current_count.count and current_count.count >= event["max_participants"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event is full"
        )
    
    # Create registration
    data = {
        "user_id": current_user.user_id,
        "event_id": event_id,
        "team_id": reg_data.team_id,
        "status": RegistrationStatus.PENDING.value,
        "payment_status": PaymentStatus.UNPAID.value,
        "payment_amount": reg_data.payment_amount,
    }
    
    response = supabase_admin.table("registrations").insert(data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to register for event"
        )
    
    return RegistrationResponse(**response.data[0])


@router.get("/my", response_model=List[RegistrationResponse])
async def my_registrations(
    current_user: CurrentUser = Depends(require_any_user),
):
    """
    Get current user's registrations.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List[RegistrationResponse]: User's registrations
    """
    response = supabase_admin.table("registrations").select("*").eq("user_id", current_user.user_id).order("registered_at", desc=True).execute()
    
    return [RegistrationResponse(**item) for item in response.data]


@router.get("/events/{event_id}/registrations", response_model=List[RegistrationResponse])
async def list_event_registrations(
    event_id: str,
    status_filter: RegistrationStatus = None,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    List all registrations for an event (organizer only).
    
    Args:
        event_id: Event ID
        status_filter: Optional status filter
        current_user: Current authenticated user
        
    Returns:
        List[RegistrationResponse]: List of registrations
        
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
    
    if current_user.role != "admin" and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view registrations for this event"
        )
    
    query = supabase_admin.table("registrations").select("*").eq("event_id", event_id)
    
    if status_filter:
        query = query.eq("status", status_filter.value)
    
    response = query.order("registered_at", desc=True).execute()
    
    return [RegistrationResponse(**item) for item in response.data]


@router.put("/{registration_id}/status", response_model=RegistrationResponse)
async def update_registration_status(
    registration_id: str,
    reg_data: RegistrationUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Update registration status (organizer only).
    
    Args:
        registration_id: Registration ID
        reg_data: Registration update data
        current_user: Current authenticated user
        
    Returns:
        RegistrationResponse: Updated registration
        
    Raises:
        HTTPException: If registration not found or access denied
    """
    # Get registration with event info
    reg_response = supabase_admin.table("registrations").select("*").eq("id", registration_id).execute()
    
    if not reg_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found"
        )
    
    registration = reg_response.data[0]
    
    # Verify event permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", registration["event_id"]).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if current_user.role != "admin" and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update registrations for this event"
        )
    
    # Update registration
    update_data = {k: v for k, v in reg_data.model_dump().items() if v is not None}
    
    response = supabase_admin.table("registrations").update(update_data).eq("id", registration_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update registration"
        )
    
    return RegistrationResponse(**response.data[0])


@router.delete("/{registration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_registration(
    registration_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """
    Delete a registration (user cancels their registration).
    
    Args:
        registration_id: Registration ID
        current_user: Current authenticated user
        
    Raises:
        HTTPException: If registration not found or access denied
    """
    # Get registration
    reg_response = supabase_admin.table("registrations").select("*").eq("id", registration_id).execute()
    
    if not reg_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found"
        )
    
    registration = reg_response.data[0]
    
    # Only the user who created the registration or an organizer can delete
    if registration["user_id"] != current_user.user_id:
        # Check if user is event organizer
        event_response = supabase_admin.table("events").select("organizer_id").eq("id", registration["event_id"]).execute()
        
        if not event_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        event = event_response.data[0]
        
        if current_user.role != "admin" and event["organizer_id"] != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this registration"
            )
    
    # Delete registration
    supabase_admin.table("registrations").delete().eq("id", registration_id).execute()
