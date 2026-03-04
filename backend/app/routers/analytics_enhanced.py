"""Analytics Router - Enhanced API endpoints for platform analytics and metrics."""
from fastapi import APIRouter, HTTPException, status, Query
from supabase import Client, create_client
from typing import List, Optional
from datetime import datetime, timedelta
import os
import re

from ..models.schemas import (
    UserActivityLogCreate,
    UserActivityLogResponse,
    EventMetricsCreate,
    EventMetricsResponse
)
from ..supabase import supabase_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_supabase_client() -> Client:
    """Get Supabase client for user-level operations.
    
    Note: This is kept for backward compatibility but endpoints 
    typically use supabase_admin for admin-level analytics.
    """
    from supabase import create_client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase configuration missing"
        )
    return create_client(supabase_url, supabase_key)


# ========================
# User Activity Log Endpoints
# ========================

@router.post("/activity", response_model=UserActivityLogResponse, status_code=status.HTTP_201_CREATED)
async def log_activity(
    activity: UserActivityLogCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Log a user activity event."""
    data = {
        "user_id": activity.user_id,
        "action": activity.action.value,
        "resource_type": activity.resource_type,
        "resource_id": activity.resource_id,
        "metadata": activity.metadata,
        "ip_address": activity.ip_address,
        "user_agent": activity.user_agent
    }
    
    response = supabase.table("user_activity_log").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/activity/user/{user_id}", response_model=List[UserActivityLogResponse])
async def get_user_activity(
    user_id: str,
    limit: int = 50,
    action: Optional[str] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """Get activity log for a specific user."""
    query = supabase.table("user_activity_log").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit)
    
    if action:
        query = query.eq("action", action)
    
    response = query.execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


@router.get("/activity/event/{event_id}", response_model=List[UserActivityLogResponse])
async def get_event_activity(
    event_id: str,
    limit: int = 100,
    supabase: Client = Depends(get_supabase_client)
):
    """Get all activity for a specific event."""
    response = supabase.table("user_activity_log").select(
        "*"
    ).eq("resource_id", event_id).order("created_at", desc=True).limit(limit).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


@router.get("/activity/recent", response_model=List[UserActivityLogResponse])
async def get_recent_activity(
    limit: int = 50,
    supabase: Client = Depends(get_supabase_client)
):
    """Get recent platform activity."""
    response = supabase.table("user_activity_log").select("*").order("created_at", desc=True).limit(limit).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


# ========================
# Event Metrics Endpoints
# ========================

@router.post("/metrics", response_model=EventMetricsResponse, status_code=status.HTTP_201_CREATED)
async def create_event_metrics(
    metrics: EventMetricsCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create or update event metrics."""
    # Check if metrics already exist for this event and date
    existing = supabase.table("event_metrics").select("id").eq("event_id", metrics.event_id).eq("date", metrics.date).execute()
    
    if existing.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=existing.error.message
        )
    
    data = {
        "event_id": metrics.event_id,
        "date": metrics.date,
        "unique_visitors": metrics.unique_visitors,
        "page_views": metrics.page_views,
        "registrations": metrics.registrations,
        "submissions": metrics.submissions,
        "active_participants": metrics.active_participants,
        "engagement_score": metrics.engagement_score
    }
    
    if existing.data:
        # Update existing
        response = supabase.table("event_metrics").update(data).eq("id", existing.data[0]["id"]).execute()
    else:
        # Insert new
        response = supabase.table("event_metrics").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/metrics/event/{event_id}", response_model=List[EventMetricsResponse])
async def get_event_metrics(
    event_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """Get metrics for a specific event."""
    query = supabase.table("event_metrics").select("*").eq("event_id", event_id).order("date", desc=True)
    
    if start_date:
        query = query.gte("date", start_date)
    if end_date:
        query = query.lte("date", end_date)
    
    response = query.execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


@router.get("/metrics/event/{event_id}/summary")
async def get_event_metrics_summary(
    event_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get aggregated summary metrics for an event."""
    response = supabase.table("event_metrics").select(
        """
        sum(unique_visitors) as total_visitors,
        sum(page_views) as total_page_views,
        sum(registrations) as total_registrations,
        sum(submissions) as total_submissions,
        avg(engagement_score) as avg_engagement_score
        """
    ).eq("event_id", event_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0] if response.data else {}


# ========================
# Dashboard Summary Endpoints
# ========================

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    days: int = Query(30, ge=1, le=365),
    supabase: Client = Depends(get_supabase_client)
):
    """Get overall platform dashboard summary."""
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # Get total events
    events_response = supabase.table("events").select("id", count="exact").execute()
    total_events = events_response.count if events_response.count else 0
    
    # Get total users
    users_response = supabase.table("users").select("id", count="exact").execute()
    total_users = users_response.count if users_response.count else 0
    
    # Get recent registrations (last N days)
    recent_registrations = supabase.table("registrations").select(
        "id", count="exact"
    ).gte("created_at", start_date).execute()
    
    # Get active events
    active_events = supabase.table("events").select(
        "id", count="exact"
    ).in_("status", ["published", "ongoing"]).execute()
    
    return {
        "total_events": total_events,
        "total_users": total_users,
        "recent_registrations": recent_registrations.count if recent_registrations.count else 0,
        "active_events": active_events.count if active_events.count else 0,
        "period_days": days
    }


@router.get("/dashboard/registrations-trend")
async def get_registrations_trend(
    days: int = Query(30, ge=1, le=90),
    supabase: Client = Depends(get_supabase_client)
):
    """Get registration trends over time."""
    # This would use the materialized view if available
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    response = supabase.table("registrations").select(
        """
        date(created_at) as date,
        count(*) as count
        """
    ).gte("created_at", start_date).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    # Group by date
    trends = {}
    for row in response.data:
        date = row.get("date")
        if date:
            if date not in trends:
                trends[date] = 0
            trends[date] += row.get("count", 0)
    
    # Format for chart
    result = [{"date": date, "registrations": count} for date, count in sorted(trends.items())]
    return result


@router.get("/dashboard/event-type-breakdown")
async def get_event_type_breakdown(
    supabase: Client = Depends(get_supabase_client)
):
    """Get breakdown of events by type."""
    response = supabase.table("events").select(
        """
        event_type,
        count(*) as count
        """
    ).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


# ========================
# Export Endpoints
# ========================

@router.get("/export/activity")
async def export_activity_log(
    start_date: str = Query(..., regex=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(..., regex=r"^\d{4}-\d{2}-\d{2}$"),
    format: str = Query("json", regex="^(json|csv)$"),
    supabase: Client = Depends(get_supabase_client)
):
    """Export activity log data."""
    # Validate date range
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        if end < start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date must be after start_date"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    
    response = supabase.table("user_activity_log").select(
        "*"
    ).gte("created_at", start_date).lte("created_at", end_date).order("created_at", desc=True).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if format == "csv":
        # Simple CSV conversion
        if not response.data:
            return {"data": ""}
        
        headers = response.data[0].keys()
        csv_lines = [",".join(headers)]
        for row in response.data:
            csv_lines.append(",".join([str(row.get(h, "")) for h in headers]))
        
        return {"data": "\n".join(csv_lines), "format": "csv"}
    
    return {"data": response.data, "format": "json"}
