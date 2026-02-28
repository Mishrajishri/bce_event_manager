"""Super Admin API routes — full platform management."""
import time
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import Dict, List, Optional
import csv
import io
import logging

from app.auth import CurrentUser, require_super_admin
from app.supabase import supabase_admin
from app.audit import log_audit
from app.models import (
    UserResponse,
    AdminUserUpdate,
    AuditLogResponse,
    PlatformStats,
    EventResponse,
    MessageResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])

# ---------------------------------------------------------------------------
# User cache — avoids fetching ALL users from Supabase on every request
# ---------------------------------------------------------------------------
_user_cache: List[dict] = []
_user_cache_ts: float = 0
_USER_CACHE_TTL = 60  # seconds


def _get_all_users(force_refresh: bool = False) -> List[dict]:
    """Return cached list of all users; refreshes every 60 seconds."""
    global _user_cache, _user_cache_ts
    if not force_refresh and _user_cache and (time.time() - _user_cache_ts) < _USER_CACHE_TTL:
        return _user_cache

    response = supabase_admin.auth.admin.list_users()
    users: List[dict] = []
    for u in response:
        if isinstance(u, list):
            for user in u:
                meta = user.user_metadata or {}
                users.append({
                    "id": user.id,
                    "email": user.email or "",
                    "first_name": meta.get("first_name", ""),
                    "last_name": meta.get("last_name", ""),
                    "phone": meta.get("phone"),
                    "role": meta.get("role", "attendee"),
                    "is_verified": user.email_confirmed_at is not None,
                    "created_at": user.created_at,
                })
        elif hasattr(u, 'id'):
            meta = u.user_metadata or {}
            users.append({
                "id": u.id,
                "email": u.email or "",
                "first_name": meta.get("first_name", ""),
                "last_name": meta.get("last_name", ""),
                "phone": meta.get("phone"),
                "role": meta.get("role", "attendee"),
                "is_verified": u.email_confirmed_at is not None,
                "created_at": u.created_at,
            })

    _user_cache = users
    _user_cache_ts = time.time()
    return users



# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_super_admin),
):
    """List all users with optional filters (uses 60s cached user list)."""
    try:
        users = _get_all_users()

        # Apply filters
        if search:
            search_lower = search.lower()
            users = [
                u for u in users
                if search_lower in u["email"].lower()
                or search_lower in u["first_name"].lower()
                or search_lower in u["last_name"].lower()
            ]

        if role:
            users = [u for u in users if u["role"] == role]

        # Pagination
        return [UserResponse(**u) for u in users[offset:offset + limit]]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}",
        )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Get a specific user by ID."""
    try:
        response = supabase_admin.auth.admin.get_user_by_id(user_id)
        user = response.user
        meta = user.user_metadata or {}

        return UserResponse(
            id=user.id,
            email=user.email or "",
            first_name=meta.get("first_name", ""),
            last_name=meta.get("last_name", ""),
            phone=meta.get("phone"),
            role=meta.get("role", "attendee"),
            is_verified=user.email_confirmed_at is not None,
            created_at=user.created_at,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    update_data: AdminUserUpdate,
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Update user metadata (role, name, etc.)."""
    try:
        # Build metadata update
        metadata_update = {}
        if update_data.first_name is not None:
            metadata_update["first_name"] = update_data.first_name
        if update_data.last_name is not None:
            metadata_update["last_name"] = update_data.last_name
        if update_data.phone is not None:
            metadata_update["phone"] = update_data.phone
        if update_data.role is not None:
            metadata_update["role"] = update_data.role.value

        response = supabase_admin.auth.admin.update_user_by_id(
            user_id,
            {"user_metadata": metadata_update}
        )

        await log_audit(
            actor_id=current_user.user_id,
            action="update_user",
            target_type="user",
            target_id=user_id,
            changes=metadata_update,
        )

        user = response.user
        meta = user.user_metadata or {}

        return UserResponse(
            id=user.id,
            email=user.email or "",
            first_name=meta.get("first_name", ""),
            last_name=meta.get("last_name", ""),
            phone=meta.get("phone"),
            role=meta.get("role", "attendee"),
            is_verified=user.email_confirmed_at is not None,
            created_at=user.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update user: {str(e)}",
        )


@router.post("/users/{user_id}/reset-password", response_model=MessageResponse)
async def reset_user_password(
    user_id: str,
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Trigger password reset email for a user via Supabase built-in flow."""
    try:
        user_response = supabase_admin.auth.admin.get_user_by_id(user_id)
        email = user_response.user.email

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has no email address",
            )

        # Use Supabase's built-in password reset which actually sends the email
        supabase_admin.auth.reset_password_email(email)

        await log_audit(
            actor_id=current_user.user_id,
            action="reset_password",
            target_type="user",
            target_id=user_id,
            changes={"email": email},
        )

        return MessageResponse(message=f"Password reset email sent to {email}", success=True)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to reset password: {str(e)}",
        )


@router.delete("/users/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: str,
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Delete/ban a user."""
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )

    try:
        supabase_admin.auth.admin.delete_user(user_id)

        await log_audit(
            actor_id=current_user.user_id,
            action="delete_user",
            target_type="user",
            target_id=user_id,
        )

        return MessageResponse(message="User deleted successfully")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete user: {str(e)}",
        )


# ---------------------------------------------------------------------------
# Events (override — manage any event)
# ---------------------------------------------------------------------------

@router.get("/events", response_model=List[EventResponse])
async def list_all_events(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_super_admin),
):
    """List ALL events regardless of ownership."""
    query = supabase_admin.table("events").select("*")

    if status_filter:
        query = query.eq("status", status_filter)

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    response = query.execute()

    return [EventResponse(**item) for item in response.data]


@router.put("/events/{event_id}/reassign", response_model=MessageResponse)
async def reassign_event(
    event_id: str,
    new_organizer_id: str = Query(..., description="New organizer user ID"),
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Reassign event ownership to another organizer."""
    response = supabase_admin.table("events").update({
        "organizer_id": new_organizer_id
    }).eq("id", event_id).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    await log_audit(
        actor_id=current_user.user_id,
        action="reassign_event",
        target_type="event",
        target_id=event_id,
        changes={"new_organizer_id": new_organizer_id},
    )

    return MessageResponse(message="Event reassigned successfully")


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_super_admin),
):
    """List audit logs with optional filters."""
    query = supabase_admin.table("audit_logs").select("*")

    if action:
        query = query.eq("action", action)
    if target_type:
        query = query.eq("target_type", target_type)
    if actor_id:
        query = query.eq("actor_id", actor_id)

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    response = query.execute()

    return [AuditLogResponse(**item) for item in response.data]


# ---------------------------------------------------------------------------
# Platform Stats
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=PlatformStats)
async def get_platform_stats(
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Get global platform statistics (uses cached user list)."""
    try:
        # Users by role — reuse cached user list
        all_users = _get_all_users()

        role_counts: Dict[str, int] = {}
        for u in all_users:
            role = u.get("role", "attendee")
            role_counts[role] = role_counts.get(role, 0) + 1

        # Events
        events_resp = supabase_admin.table("events").select("id, status").execute()
        total_events = len(events_resp.data)
        active_events = len([e for e in events_resp.data if e["status"] in ("published", "ongoing")])

        # Registrations + revenue
        reg_resp = supabase_admin.table("registrations").select("id, payment_amount, payment_status").execute()
        total_registrations = len(reg_resp.data)
        total_revenue = sum(
            r.get("payment_amount", 0)
            for r in reg_resp.data
            if r.get("payment_status") == "paid"
        )

        return PlatformStats(
            total_users=len(all_users),
            total_events=total_events,
            total_registrations=total_registrations,
            total_revenue=total_revenue,
            active_events=active_events,
            users_by_role=role_counts,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stats: {str(e)}",
        )


# ---------------------------------------------------------------------------
# CSV Exports
# ---------------------------------------------------------------------------

@router.get("/export/users")
async def export_users_csv(
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Export all users as CSV."""
    user_response = supabase_admin.auth.admin.list_users()
    all_users = []
    for u in user_response:
        if isinstance(u, list):
            all_users.extend(u)
        elif hasattr(u, 'id'):
            all_users.append(u)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Email", "First Name", "Last Name", "Role", "Verified", "Created At"])

    for u in all_users:
        meta = u.user_metadata or {}
        writer.writerow([
            u.id,
            u.email,
            meta.get("first_name", ""),
            meta.get("last_name", ""),
            meta.get("role", "attendee"),
            "Yes" if u.email_confirmed_at else "No",
            str(u.created_at),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users_export.csv"},
    )
