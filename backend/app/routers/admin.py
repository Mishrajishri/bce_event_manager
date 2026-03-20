"""Super Admin API routes — full platform management."""
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from typing import Dict, List, Optional, Any
import csv
import io
import logging

from app.auth import CurrentUser, require_super_admin
from app.supabase import supabase_admin
from app.audit import log_audit
from app.limiter import limiter
from app.models import (
    UserResponse,
    AdminUserUpdate,
    AuditLogResponse,
    PlatformStats,
    EventResponse,
    MessageResponse,
)

from pydantic import BaseModel


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
@limiter.limit("10/minute")
async def update_user(
    request: Request,
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
@limiter.limit("3/minute")
async def reset_user_password(
    request: Request,
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
@limiter.limit("5/minute")
async def delete_user(
    request: Request,
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


class BulkUserActionRequest(BaseModel):
    user_ids: List[str]
    action: str  # "activate", "deactivate", "delete", "update_role"
    role: Optional[str] = None  # For update_role action


@router.post("/users/bulk-action", response_model=MessageResponse)
@limiter.limit("5/minute")
async def bulk_user_action(
    request: Request,
    bulk_data: BulkUserActionRequest,
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Perform bulk actions on multiple users."""
    user_ids = bulk_data.user_ids
    action = bulk_data.action
    
    if not user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No users specified",
        )
    
    if current_user.user_id in user_ids and action == "delete":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot perform bulk delete on yourself",
        )
    
    results = {"success": 0, "failed": 0, "errors": []}
    
    for user_id in user_ids:
        try:
            if action == "delete":
                supabase_admin.auth.admin.delete_user(user_id)
                await log_audit(
                    actor_id=current_user.user_id,
                    action="bulk_delete_user",
                    target_type="user",
                    target_id=user_id,
                )
                results["success"] += 1
            elif action == "update_role" and bulk_data.role:
                metadata_update = {"role": bulk_data.role}
                supabase_admin.auth.admin.update_user_by_id(
                    user_id,
                    {"user_metadata": metadata_update}
                )
                await log_audit(
                    actor_id=current_user.user_id,
                    action="bulk_update_role",
                    target_type="user",
                    target_id=user_id,
                    changes={"new_role": bulk_data.role},
                )
                results["success"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(f"Invalid action or missing role for user {user_id}")
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"Failed to process user {user_id}: {str(e)}")
    
    return MessageResponse(
        message=f"Bulk action completed: {results['success']} success, {results['failed']} failed"
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
@limiter.limit("3/minute")
async def reassign_event(
    request: Request,
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


class CloneEventRequest(BaseModel):
    name: str


@router.post("/events/{event_id}/clone", response_model=EventResponse)
@limiter.limit("3/minute")
async def clone_event(
    request: Request,
    event_id: str,
    clone_data: CloneEventRequest,
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Clone an event with a new name."""
    # Get original event
    response = supabase_admin.table("events").select("*").eq("id", event_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    
    original_event = response.data[0]
    
    # Create new event with copied data (except id, created_at)
    new_event_data = {
        "name": clone_data.name,
        "description": original_event.get("description"),
        "event_type": original_event.get("event_type"),
        "status": "draft",  # Start as draft
        "start_date": original_event.get("start_date"),
        "end_date": original_event.get("end_date"),
        "registration_start": original_event.get("registration_start"),
        "registration_end": original_event.get("registration_end"),
        "location": original_event.get("location"),
        "venue": original_event.get("venue"),
        "max_participants": original_event.get("max_participants"),
        "registration_fee": original_event.get("registration_fee"),
        "organizer_id": current_user.user_id,  # New event owned by admin
    }
    
    new_response = supabase_admin.table("events").insert(new_event_data).execute()
    
    if not new_response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to clone event",
        )
    
    cloned_event = new_response.data[0]
    
    await log_audit(
        actor_id=current_user.user_id,
        action="clone_event",
        target_type="event",
        target_id=cloned_event["id"],
        changes={"original_event_id": event_id, "new_name": clone_data.name},
    )
    
    return EventResponse(**cloned_event)


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


@router.get("/export/audit-logs")
@limiter.limit("2/minute")
async def export_audit_logs_csv(
    request: Request,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Export audit logs as CSV."""
    query = supabase_admin.table("audit_logs").select("*")

    if action:
        query = query.eq("action", action)
    if target_type:
        query = query.eq("target_type", target_type)
    if actor_id:
        query = query.eq("actor_id", actor_id)

    query = query.order("created_at", desc=True).limit(10000)
    response = query.execute()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Actor ID", "Action", "Target Type", "Target ID", "Changes", "Created At"])

    for item in response.data:
        writer.writerow([
            item.get("id"),
            item.get("actor_id"),
            item.get("action"),
            item.get("target_type"),
            item.get("target_id"),
            str(item.get("changes", {})),
            item.get("created_at"),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs_export.csv"},
    )


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

        # Events by status
        events_by_status: Dict[str, int] = {}
        for e in events_resp.data:
            status = e.get("status", "draft")
            events_by_status[status] = events_by_status.get(status, 0) + 1

        # Registrations + revenue
        reg_resp = supabase_admin.table("registrations").select("id, payment_amount, payment_status, status").execute()
        total_registrations = len(reg_resp.data)
        total_revenue = sum(
            r.get("payment_amount", 0)
            for r in reg_resp.data
            if r.get("payment_status") == "paid"
        )

        # Registrations by status
        registrations_by_status: Dict[str, int] = {}
        for r in reg_resp.data:
            status = r.get("status", "pending")
            registrations_by_status[status] = registrations_by_status.get(status, 0) + 1

        # Recent registrations (last 7 days)
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        recent_reg_resp = supabase_admin.table("registrations").select("id").gte("registered_at", seven_days_ago).execute()
        recent_registrations = len(recent_reg_resp.data)

        return PlatformStats(
            total_users=len(all_users),
            total_events=total_events,
            total_registrations=total_registrations,
            total_revenue=total_revenue,
            active_events=active_events,
            users_by_role=role_counts,
            events_by_status=events_by_status,
            registrations_by_status=registrations_by_status,
            recent_registrations=recent_registrations,
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
@limiter.limit("2/minute")
async def export_users_csv(
    request: Request,
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


# ---------------------------------------------------------------------------
# Enhanced Platform Stats with Trends
# ---------------------------------------------------------------------------

class PlatformStatsEnhanced(BaseModel):
    total_users: int
    total_events: int
    total_registrations: int
    total_revenue: float
    active_events: int
    users_by_role: Dict[str, int]
    events_by_status: Dict[str, int]
    registrations_by_status: Dict[str, int]
    recent_registrations: int
    # New enhanced fields
    events_by_type: Dict[str, int]
    revenue_by_month: List[Dict[str, Any]]
    registrations_by_month: List[Dict[str, Any]]
    user_growth_by_month: List[Dict[str, Any]]
    top_organizers: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]


@router.get("/stats/enhanced", response_model=PlatformStatsEnhanced)
async def get_platform_stats_enhanced(
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Get enhanced platform statistics with trends and analytics."""
    try:
        # Users by role
        all_users = _get_all_users()
        role_counts: Dict[str, int] = {}
        for u in all_users:
            role = u.get("role", "attendee")
            role_counts[role] = role_counts.get(role, 0) + 1

        # Events
        events_resp = supabase_admin.table("events").select("*").execute()
        total_events = len(events_resp.data)
        active_events = len([e for e in events_resp.data if e["status"] in ("published", "ongoing")])

        events_by_status: Dict[str, int] = {}
        events_by_type: Dict[str, int] = {}
        for e in events_resp.data:
            status = e.get("status", "draft")
            events_by_status[status] = events_by_status.get(status, 0) + 1
            event_type = e.get("event_type", "other")
            events_by_type[event_type] = events_by_type.get(event_type, 0) + 1

        # Registrations + revenue
        reg_resp = supabase_admin.table("registrations").select("*").execute()
        total_registrations = len(reg_resp.data)
        total_revenue = sum(
            r.get("payment_amount", 0)
            for r in reg_resp.data
            if r.get("payment_status") == "paid"
        )

        registrations_by_status: Dict[str, int] = {}
        for r in reg_resp.data:
            status = r.get("status", "pending")
            registrations_by_status[status] = registrations_by_status.get(status, 0) + 1

        # Recent registrations (last 7 days)
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        recent_reg_resp = supabase_admin.table("registrations").select("id").gte("registered_at", seven_days_ago).execute()
        recent_registrations = len(recent_reg_resp.data)

        # Revenue by month (last 6 months)
        revenue_by_month = []
        for i in range(5, -1, -1):
            month_start = (datetime.utcnow().replace(day=1) - timedelta(days=i*30)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            month_str = month_start.strftime("%Y-%m")
            
            month_regs = [
                r for r in reg_resp.data
                if r.get("registered_at") and month_start.isoformat() <= r["registered_at"] < month_end.isoformat()
            ]
            revenue = sum(r.get("payment_amount", 0) for r in month_regs if r.get("payment_status") == "paid")
            revenue_by_month.append({"month": month_str, "revenue": revenue})

        # Registrations by month
        registrations_by_month = []
        for i in range(5, -1, -1):
            month_start = (datetime.utcnow().replace(day=1) - timedelta(days=i*30)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            month_str = month_start.strftime("%Y-%m")
            
            count = len([
                r for r in reg_resp.data
                if r.get("registered_at") and month_start.isoformat() <= r["registered_at"] < month_end.isoformat()
            ])
            registrations_by_month.append({"month": month_str, "count": count})

        # User growth by month
        user_growth_by_month = []
        for i in range(5, -1, -1):
            month_start = (datetime.utcnow().replace(day=1) - timedelta(days=i*30)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            month_str = month_start.strftime("%Y-%m")
            
            count = len([
                u for u in all_users
                if u.get("created_at") and month_start.isoformat() <= u["created_at"] < month_end.isoformat()
            ])
            user_growth_by_month.append({"month": month_str, "count": count})

        # Top organizers by event count
        organizer_event_counts: Dict[str, int] = {}
        for e in events_resp.data:
            org_id = e.get("organizer_id")
            if org_id:  # Skip events without organizer
                organizer_event_counts[org_id] = organizer_event_counts.get(org_id, 0) + 1
        
        top_organizer_ids = sorted(organizer_event_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        top_organizers = []
        for org_id, count in top_organizer_ids:
            org_user = next((u for u in all_users if u["id"] == org_id), None)
            if org_user:
                top_organizers.append({
                    "id": org_id,
                    "email": org_user.get("email"),
                    "name": f"{org_user.get('first_name', '')} {org_user.get('last_name', '')}".strip(),
                    "event_count": count,
                })

        # Recent activity (last 10 events/registrations)
        recent_activity = []
        recent_events = sorted(events_resp.data, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
        for e in recent_events:
            recent_activity.append({
                "type": "event_created",
                "description": f"Event created: {e.get('name')}",
                "timestamp": e.get("created_at"),
            })
        
        recent_regs = sorted(reg_resp.data, key=lambda x: x.get("registered_at", ""), reverse=True)[:5]
        for r in recent_regs:
            recent_activity.append({
                "type": "registration",
                "description": f"New registration",
                "timestamp": r.get("registered_at"),
            })
        
        recent_activity.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        recent_activity = recent_activity[:10]

        return PlatformStatsEnhanced(
            total_users=len(all_users),
            total_events=total_events,
            total_registrations=total_registrations,
            total_revenue=total_revenue,
            active_events=active_events,
            users_by_role=role_counts,
            events_by_status=events_by_status,
            registrations_by_status=registrations_by_status,
            recent_registrations=recent_registrations,
            events_by_type=events_by_type,
            revenue_by_month=revenue_by_month,
            registrations_by_month=registrations_by_month,
            user_growth_by_month=user_growth_by_month,
            top_organizers=top_organizers,
            recent_activity=recent_activity,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch enhanced stats: {str(e)}",
        )


# ---------------------------------------------------------------------------
# System Settings
# ---------------------------------------------------------------------------

# In-memory system settings (in production, use a database table)
_system_settings: Dict[str, Any] = {
    "platform_name": "BCE Event Manager",
    "allow_registration": True,
    "require_email_verification": True,
    "max_events_per_organizer": 10,
    "default_registration_fee": 0.0,
    "support_email": "support@bceevents.com",
}


@router.get("/settings")
async def get_system_settings(
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Get system settings."""
    return _system_settings


class SystemSettingsUpdate(BaseModel):
    platform_name: Optional[str] = None
    allow_registration: Optional[bool] = None
    require_email_verification: Optional[bool] = None
    max_events_per_organizer: Optional[int] = None
    default_registration_fee: Optional[float] = None
    support_email: Optional[str] = None


@router.put("/settings")
async def update_system_settings(
    settings: SystemSettingsUpdate,
    current_user: CurrentUser = Depends(require_super_admin),
):
    """Update system settings."""
    global _system_settings
    
    update_data = settings.model_dump(exclude_unset=True)
    _system_settings.update(update_data)
    
    await log_audit(
        actor_id=current_user.user_id,
        action="update_settings",
        target_type="system",
        target_id="system_settings",
        changes=update_data,
    )
    
    return {"message": "Settings updated successfully", "settings": _system_settings}
