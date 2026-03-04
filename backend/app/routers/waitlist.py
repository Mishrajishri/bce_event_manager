"""Waitlist API routes for event management."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone
from app.auth import CurrentUser, require_any_user, require_organizer
from app.services.waitlist import WaitlistService
from app.supabase import supabase_admin

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])


@router.get("/position/{event_id}", response_model=Optional[int])
async def get_waitlist_position(
    event_id: str,
    current_user: CurrentUser = Depends(require_any_user)
):
    """Get current user's waitlist position for an event.
    
    Returns the waitlist position (1-indexed) or null if not waitlisted.
    """
    return await WaitlistService.get_waitlist_position(event_id, current_user.user_id)


@router.get("/event/{event_id}")
async def get_event_waitlist(
    event_id: str,
    current_user: CurrentUser = Depends(require_any_user)
):
    """Get waitlist for an event (organizer only).
    
    Returns detailed waitlist information including user details.
    Requires organizer or admin role.
    """
    # Check if user is organizer or admin
    event = supabase_admin.table("events")\
        .select("organizer_id")\
        .eq("id", event_id)\
        .single()\
        .execute()

    if not event.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    if event.data["organizer_id"] != current_user.user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this event's waitlist"
        )

    waitlist = await WaitlistService.get_event_waitlist(event_id)
    return waitlist


@router.post("/promote/{event_id}")
async def manually_promote_from_waitlist(
    event_id: str,
    current_user: CurrentUser = Depends(require_any_user)
):
    """Manually promote first person from waitlist (organizer only).
    
    Promotes the first person in the waitlist to confirmed status.
    Automatically reorders remaining waitlist positions.
    """
    try:
        promoted = await WaitlistService.manually_promote(
            event_id, 
            current_user.user_id
        )

        if not promoted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users on waitlist to promote"
            )

        return {
            "success": True,
            "message": "User promoted from waitlist",
            "registration": promoted
        }

    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.get("/stats/{event_id}")
async def get_waitlist_stats(
    event_id: str,
    current_user: CurrentUser = Depends(require_any_user)
):
    """Get waitlist statistics for an event (organizer only).
    
    Returns:
    - count: Number of people on waitlist
    - max_position: Highest waitlist position
    - avg_wait_time_hours: Average time spent on waitlist
    """
    # Check authorization
    event = supabase_admin.table("events")\
        .select("organizer_id")\
        .eq("id", event_id)\
        .single()\
        .execute()

    if not event.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    if event.data["organizer_id"] != current_user.user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    stats = await WaitlistService.get_waitlist_stats(event_id)
    return stats


@router.get("/history/{event_id}")
async def get_waitlist_history(
    event_id: str,
    current_user: CurrentUser = Depends(require_any_user)
):
    """Get waitlist history for an event (organizer only).
    
    Returns audit trail of all waitlist actions (additions, promotions, cancellations).
    """
    # Check authorization
    event = supabase_admin.table("events")\
        .select("organizer_id")\
        .eq("id", event_id)\
        .single()\
        .execute()

    if not event.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    if event.data["organizer_id"] != current_user.user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    # Get all registration IDs for this event first
    regs = supabase_admin.table("registrations")\
        .select("id")\
        .eq("event_id", event_id)\
        .execute()

    if not regs.data:
        return []

    reg_ids = [r["id"] for r in regs.data]

    # Get waitlist history for these registrations
    history = supabase_admin.table("waitlist_history")\
        .select(
            "id, action, old_position, new_position, notes, created_at, "
            "registration_id, "
            "registrations(id, user_id, users(first_name, last_name, email))"
        )\
        .in_("registration_id", reg_ids)\
        .order("created_at", desc=True)\
        .execute()

    return history.data


@router.get("/my-position/{event_id}")
async def get_my_waitlist_details(
    event_id: str,
    current_user: CurrentUser = Depends(require_any_user)
):
    """Get detailed waitlist information for current user.
    
    Returns position, wait time, and estimated promotion time.
    """
    position = await WaitlistService.get_waitlist_position(
        event_id, 
        current_user.user_id
    )

    if not position:
        return {
            "on_waitlist": False,
            "position": None,
            "wait_time": None
        }

    # Get registration details
    reg = supabase_admin.table("registrations")\
        .select("waitlisted_at")\
        .eq("event_id", event_id)\
        .eq("user_id", current_user.user_id)\
        .eq("status", "waitlisted")\
        .single()\
        .execute()

    if not reg.data:
        return {
            "on_waitlist": False,
            "position": None,
            "wait_time": None
        }

    waitlisted_at_str = reg.data["waitlisted_at"]
    # Handle both timezone-aware and naive ISO strings
    if waitlisted_at_str.endswith('Z'):
        waitlisted_at = datetime.fromisoformat(waitlisted_at_str.replace('Z', '+00:00'))
    else:
        waitlisted_at = datetime.fromisoformat(waitlisted_at_str)
    wait_time = datetime.now(timezone.utc) - waitlisted_at

    # Get total waitlist count for context
    stats = await WaitlistService.get_waitlist_stats(event_id)

    return {
        "on_waitlist": True,
        "position": position,
        "total_on_waitlist": stats["count"],
        "wait_time_hours": round(wait_time.total_seconds() / 3600, 1),
        "waitlisted_at": reg.data["waitlisted_at"]
    }
