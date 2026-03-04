"""Registrations Enhanced Router - Extended registration features including waitlist."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import os

from ..models.schemas import RegistrationResponse, RegistrationStatus
from ..auth import CurrentUser, require_any_user
from ..supabase import supabase_admin
from ..services.waitlist import WaitlistService

router = APIRouter(prefix="/registrations-enhanced", tags=["Registrations Enhanced"])


def get_supabase_client():
    """Get Supabase client."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase configuration missing"
        )
    from supabase import create_client
    return create_client(supabase_url, supabase_key)


@router.get("/event/{event_id}/waitlist")
async def get_event_waitlist(
    event_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get waitlist for an event."""
    # Verify event exists
    event_response = supabase_admin.table("events").select("id, name, max_participants, organizer_id").eq("id", event_id).execute()
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    # Check permissions
    if current_user.role not in ("super_admin", "admin", "organizer") and event.get("organizer_id") != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can view the waitlist"
        )
    
    # Get confirmed registration count (use registrations table with status='confirmed')
    confirmed_count = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).eq("status", "confirmed").execute()
    
    # Get waitlist entries from registrations table with status='waitlisted'
    waitlist_response = supabase_admin.table("registrations").select(
        "id, user_id, waitlist_position, waitlisted_at, users(id, first_name, last_name, email, phone)"
    ).eq("event_id", event_id).eq("status", "waitlisted").order("waitlist_position", asc=True).range(offset, offset + limit - 1).execute()
    
    waitlist = waitlist_response.data
    
    # Get total waitlist count
    total_waitlist = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).eq("status", "waitlisted").execute()
    
    return {
        "event": event,
        "current_registrations": confirmed_count.count if confirmed_count.count else 0,
        "max_capacity": event.get("max_participants"),
        "waitlist": waitlist,
        "total_waitlist": total_waitlist.count if total_waitlist.count else 0
    }


@router.get("/event/{event_id}/waitlist-position/{user_id}")
async def get_waitlist_position(
    event_id: str,
    user_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get a specific user's waitlist position."""
    # Users can only check their own position
    if current_user.user_id != user_id and current_user.role not in ("super_admin", "admin", "organizer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only check your own waitlist position"
        )
    
    # Get waitlist entry from registrations table
    waitlist_response = supabase_admin.table("registrations").select(
        "id, waitlist_position, waitlisted_at"
    ).eq("event_id", event_id).eq("user_id", user_id).eq("status", "waitlisted").execute()
    
    if not waitlist_response.data:
        # Check if user is registered
        reg_response = supabase_admin.table("registrations").select("status").eq("event_id", event_id).eq("user_id", user_id).execute()
        if reg_response.data:
            return {
                "is_on_waitlist": False,
                "is_registered": True,
                "message": "User is registered for this event"
            }
        return {
            "is_on_waitlist": False,
            "is_registered": False,
            "message": "User is not registered for this event"
        }
    
    entry = waitlist_response.data[0]
    
    # Get current registration count
    confirmed_count = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).eq("status", "confirmed").execute()
    
    # Get event data for better estimate
    event_response = supabase_admin.table("events").select("max_participants, registration_deadline").eq("id", event_id).execute()
    max_capacity = event_response.data[0].get("max_participants") if event_response.data else 0
    deadline = event_response.data[0].get("registration_deadline") if event_response.data else None
    
    current_count = confirmed_count.count if confirmed_count.count else 0
    
    # Calculate spots available
    spots_available = max(0, max_capacity - current_count)
    
    # Estimate wait time based on position and average registration rate
    # Use a more realistic estimate: 4 hours per person ahead in queue
    # This could be improved by tracking actual wait times in the future
    avg_hours_per_position = 4
    estimated_wait_hours = entry.get("waitlist_position", 1) * avg_hours_per_position
    
    # If event registration deadline has passed, estimate is invalid
    if deadline:
        from datetime import datetime, timezone
        try:
            if isinstance(deadline, str):
                deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            else:
                deadline_dt = deadline
            if deadline_dt < datetime.now(timezone.utc):
                estimated_wait_hours = None  # Past deadline, can't estimate
        except:
            pass
    
    return {
        "is_on_waitlist": True,
        "position": entry.get("waitlist_position"),
        "spots_available": spots_available,
        "estimated_wait_hours": estimated_wait_hours,
        "registered_at": entry.get("waitlisted_at")
    }


@router.post("/event/{event_id}/waitlist/{user_id}/promote")
async def promote_from_waitlist(
    event_id: str,
    user_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Manually promote a user from waitlist to registered (organizer only)."""
    # Check permissions
    if current_user.role not in ("super_admin", "admin", "organizer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can promote from waitlist"
        )
    
    # Verify event exists
    event_response = supabase_admin.table("events").select("id, organizer_id").eq("id", event_id).execute()
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    # Verify organizer owns the event
    if current_user.role not in ("super_admin", "admin") and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission for this event"
        )
    
    # Get waitlist entry from registrations table
    waitlist_response = supabase_admin.table("registrations").select("*").eq("event_id", event_id).eq("user_id", user_id).eq("status", "waitlisted").execute()
    
    if not waitlist_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not on the waitlist"
        )
    
    # Promote specific user from waitlist
    result = await WaitlistService.promote_specific_user(event_id, user_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed to promote user from waitlist"
        )
    
    return {
        "message": "User promoted from waitlist",
        "user_id": user_id,
        "new_status": "confirmed"
    }


@router.delete("/event/{event_id}/waitlist/{user_id}")
async def remove_from_waitlist(
    event_id: str,
    user_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Remove a user from the waitlist (user or organizer)."""
    # Users can remove themselves, organizers can remove anyone
    if current_user.user_id != user_id and current_user.role not in ("super_admin", "admin", "organizer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only remove yourself from the waitlist"
        )
    
    # Get waitlist entry from registrations table
    waitlist_response = supabase_admin.table("registrations").select("*").eq("event_id", event_id).eq("user_id", user_id).eq("status", "waitlisted").execute()
    
    if not waitlist_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not on the waitlist"
        )
    
    # Cancel the registration (which will handle reordering)
    await WaitlistService.cancel_registration(waitlist_response.data[0]["id"])
    
    return {"message": "Removed from waitlist successfully"}


@router.get("/event/{event_id}/registration-stats")
async def get_registration_stats(
    event_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get detailed registration statistics for an event."""
    # Verify event exists
    event_response = supabase_admin.table("events").select("id, name, max_participants, registration_deadline").eq("id", event_id).execute()
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    # Check permissions
    if current_user.role not in ("super_admin", "admin", "organizer") and event.get("organizer_id") != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can view detailed stats"
        )
    
    # Get registration counts by status
    confirmed = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).eq("status", "confirmed").execute()
    pending = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).eq("status", "pending").execute()
    cancelled = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).eq("status", "cancelled").execute()
    
    # Get waitlist count from registrations table
    waitlist_count = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).eq("status", "waitlisted").execute()
    
    # Get payment stats
    paid = supabase_admin.table("registrations").select("payment_amount", count="exact").eq("event_id", event_id).eq("payment_status", "paid").execute()
    unpaid = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).eq("payment_status", "unpaid").execute()
    
    # Calculate total revenue
    total_revenue = 0
    if paid.data:
        for r in paid.data:
            total_revenue += r.get("payment_amount", 0) or 0
    
    # Checked in count
    checked_in = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).not_.is_("checked_in_at", "null").execute()
    
    return {
        "event_id": event_id,
        "event_name": event.get("name"),
        "max_participants": event.get("max_participants"),
        "registration_deadline": event.get("registration_deadline"),
        "status_breakdown": {
            "confirmed": confirmed.count if confirmed.count else 0,
            "pending": pending.count if pending.count else 0,
            "cancelled": cancelled.count if cancelled.count else 0
        },
        "waitlist": waitlist_count.count if waitlist_count.count else 0,
        "payment_breakdown": {
            "paid": paid.count if paid.count else 0,
            "unpaid": unpaid.count if unpaid.count else 0,
            "total_revenue": total_revenue
        },
        "checked_in": checked_in.count if checked_in.count else 0
    }


@router.post("/event/{event_id}/bulk-status-update")
async def bulk_update_registration_status(
    event_id: str,
    registration_ids: List[str],
    new_status: RegistrationStatus,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Bulk update registration status (organizer only)."""
    # Check permissions
    if current_user.role not in ("super_admin", "admin", "organizer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can bulk update registrations"
        )
    
    # Verify event exists
    event_response = supabase_admin.table("events").select("id, organizer_id").eq("id", event_id).execute()
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    # Verify organizer owns the event
    if current_user.role not in ("super_admin", "admin") and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission for this event"
        )
    
    # Bulk update
    response = supabase_admin.table("registrations").update({"status": new_status.value}).in_("id", registration_ids).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return {
        "message": f"Updated {len(registration_ids)} registrations",
        "new_status": new_status.value
    }
