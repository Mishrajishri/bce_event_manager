"""Organizer API routes — event management and analytics for organizers."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone, timedelta

from app.auth import CurrentUser, require_organizer
from app.supabase import supabase_admin
from app.models import (
    OrganizerAnalytics,
    OrganizerOverviewStats,
    RegistrationTrend,
    RevenueByEvent,
    PaymentBreakdown,
    AttendanceFunnel,
    EventPerformance,
    RecentActivity,
    EventResponse,
)

router = APIRouter(prefix="/organizer", tags=["Organizer"])


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def get_organizer_events(user_id: str) -> List[dict]:
    """Get all events owned by the organizer."""
    response = (
        supabase_admin.table("events")
        .select("*")
        .eq("organizer_id", user_id)
        .execute()
    )
    return response.data


def calculate_checkin_rate(registrations: List[dict]) -> float:
    """Calculate check-in rate from registrations."""
    if not registrations:
        return 0.0
    checked_in = len([r for r in registrations if r.get("checked_in_at")])
    return round((checked_in / len(registrations)) * 100, 2)


def get_event_registrations(event_id: str) -> List[dict]:
    """Get all registrations for an event."""
    response = (
        supabase_admin.table("registrations")
        .select("*, users(first_name, last_name)")
        .eq("event_id", event_id)
        .execute()
    )
    return response.data


def get_registration_trends(event_ids: List[str], days: int = 30) -> List[RegistrationTrend]:
    """Get registration trends for the last N days - optimized single query."""
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)
    
    # Single query for all events and date range - avoids N+1 problem
    regs = (
        supabase_admin.table("registrations")
        .select("registered_at, checked_in_at")
        .in_("event_id", event_ids)
        .gte("registered_at", f"{start_date}T00:00:00")
        .execute()
    )
    
    # Initialize trends with all dates
    trends_map: dict[str, dict[str, int]] = {}
    for i in range(days - 1, -1, -1):
        date = today - timedelta(days=i)
        trends_map[str(date)] = {"registrations": 0, "checkins": 0}
    
    # Group registrations by date
    for r in regs.data:
        reg_date = r["registered_at"][:10]  # Extract YYYY-MM-DD
        if reg_date in trends_map:
            trends_map[reg_date]["registrations"] += 1
            if r.get("checked_in_at"):
                trends_map[reg_date]["checkins"] += 1
    
    return [
        RegistrationTrend(date=d, registrations=v["registrations"], checkins=v["checkins"])
        for d, v in sorted(trends_map.items())
    ]


# ---------------------------------------------------------------------------
# Analytics Endpoints
# ---------------------------------------------------------------------------

@router.get("/analytics", response_model=OrganizerAnalytics)
async def get_organizer_analytics(
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Get comprehensive analytics for the organizer's events.
    
    Returns:
        OrganizerAnalytics: Complete analytics data including overview stats,
        trends, revenue breakdown, and event performance.
    """
    user_id = current_user.user_id
    
    # Get all events owned by this organizer
    events = get_organizer_events(user_id)
    event_ids = [e["id"] for e in events]
    
    if not events:
        # Return empty analytics if no events
        return OrganizerAnalytics(
            overview=OrganizerOverviewStats(
                total_events=0,
                active_events=0,
                draft_events=0,
                total_registrations=0,
                confirmed_registrations=0,
                checkin_rate=0.0,
                total_revenue=0.0,
                collection_rate=0.0,
                total_expenses=0.0,
                budget_utilization=0.0,
            ),
            registration_trends=[],
            revenue_by_event=[],
            payment_breakdown=[],
            attendance_funnel=[],
            events=[],
            recent_activity=[],
        )
    
    # Calculate overview stats
    total_events = len(events)
    active_events = len([e for e in events if e["status"] in ("published", "ongoing")])
    draft_events = len([e for e in events if e["status"] == "draft"])
    
    # Aggregate registration data across all events
    all_registrations = []
    total_revenue = 0.0
    total_expenses = 0.0
    paid_count = 0
    
    for event in events:
        regs = get_event_registrations(event["id"])
        all_registrations.extend(regs)
        
        # Revenue calculation
        for r in regs:
            if r.get("payment_status") == "paid":
                total_revenue += r.get("payment_amount", 0)
                paid_count += 1
        
        # Expenses
        expenses_resp = (
            supabase_admin.table("expenses")
            .select("amount")
            .eq("event_id", event["id"])
            .execute()
        )
        total_expenses += sum(e.get("amount", 0) for e in expenses_resp.data)
    
    total_registrations = len(all_registrations)
    confirmed_registrations = len([r for r in all_registrations if r.get("status") == "confirmed"])
    checkin_rate = calculate_checkin_rate(all_registrations)
    collection_rate = round((paid_count / total_registrations * 100), 2) if total_registrations > 0 else 0.0
    
    # Budget utilization: handle edge cases where revenue is 0 but expenses exist
    if total_revenue > 0:
        budget_utilization = round((total_expenses / total_revenue * 100), 2)
    elif total_expenses > 0:
        budget_utilization = 100.0  # Expenses with no revenue = 100% over budget
    else:
        budget_utilization = 0.0  # No revenue, no expenses
    
    # Registration trends (last 30 days)
    registration_trends = get_registration_trends(event_ids, days=30)
    
    # Revenue by event
    revenue_by_event = []
    for event in events:
        event_revenue = sum(
            r.get("payment_amount", 0)
            for r in all_registrations
            if r["event_id"] == event["id"] and r.get("payment_status") == "paid"
        )
        revenue_by_event.append(RevenueByEvent(
            event_id=event["id"],
            event_name=event["name"],
            revenue=event_revenue,
            target=event.get("budget", 0) or event_revenue * 1.2,  # Default target if not set
        ))
    
    # Payment breakdown
    payment_statuses = {}
    for r in all_registrations:
        status = r.get("payment_status", "unpaid")
        if status not in payment_statuses:
            payment_statuses[status] = {"count": 0, "amount": 0.0}
        payment_statuses[status]["count"] += 1
        payment_statuses[status]["amount"] += r.get("payment_amount", 0)
    
    payment_breakdown = [
        PaymentBreakdown(status=s, count=d["count"], amount=d["amount"])
        for s, d in payment_statuses.items()
    ]
    
    # Attendance funnel
    checked_in = len([r for r in all_registrations if r.get("checked_in_at")])
    attendance_funnel = [
        AttendanceFunnel(stage="registered", count=total_registrations),
        AttendanceFunnel(stage="confirmed", count=confirmed_registrations),
        AttendanceFunnel(stage="checked_in", count=checked_in),
    ]
    
    # Event performance list
    events_performance = []
    for event in events:
        event_regs = [r for r in all_registrations if r["event_id"] == event["id"]]
        event_revenue = sum(
            r.get("payment_amount", 0)
            for r in event_regs
            if r.get("payment_status") == "paid"
        )
        event_expenses = sum(
            e.get("amount", 0)
            for e in supabase_admin.table("expenses")
            .select("amount")
            .eq("event_id", event["id"])
            .execute()
            .data
        )
        
        # Calculate capacity - use max_participants if set, otherwise use a reasonable default
        # Don't use team_size_max as that's per-team, not total event capacity
        capacity = event.get("max_participants") or 100  # Default to 100 if unlimited
        fill_rate = round((len(event_regs) / capacity * 100), 2) if capacity > 0 else 0.0
        
        events_performance.append(EventPerformance(
            event_id=event["id"],
            name=event["name"],
            type=event["event_type"],
            status=event["status"],
            start_date=event["start_date"],
            registrations=len(event_regs),
            capacity=capacity,
            fill_rate=fill_rate,
            revenue=event_revenue,
            expenses=event_expenses,
            profit=event_revenue - event_expenses,
            checkin_rate=calculate_checkin_rate(event_regs),
            trend="up" if len(event_regs) > capacity * 0.5 else "stable",
        ))
    
    # Recent activity (last 10 items)
    recent_activity = []
    
    # Recent registrations
    recent_regs = (
        supabase_admin.table("registrations")
        .select("*, events(name), users(first_name, last_name)")
        .in_("event_id", event_ids)
        .order("registered_at", desc=True)
        .limit(5)
        .execute()
    )
    
    for r in recent_regs.data:
        recent_activity.append(RecentActivity(
            id=r["id"],
            type="registration",
            description=f"New registration for {r['events']['name']}",
            timestamp=r["registered_at"],
            user_name=f"{r['users']['first_name']} {r['users']['last_name']}" if r.get("users") else None,
            event_name=r["events"]["name"],
        ))
    
    return OrganizerAnalytics(
        overview=OrganizerOverviewStats(
            total_events=total_events,
            active_events=active_events,
            draft_events=draft_events,
            total_registrations=total_registrations,
            confirmed_registrations=confirmed_registrations,
            checkin_rate=checkin_rate,
            total_revenue=total_revenue,
            collection_rate=collection_rate,
            total_expenses=total_expenses,
            budget_utilization=budget_utilization,
        ),
        registration_trends=registration_trends,
        revenue_by_event=revenue_by_event,
        payment_breakdown=payment_breakdown,
        attendance_funnel=attendance_funnel,
        events=events_performance,
        recent_activity=recent_activity,
    )


@router.get("/events", response_model=List[EventResponse])
async def list_organizer_events(
    current_user: CurrentUser = Depends(require_organizer),
):
    """List all events owned by the current organizer."""
    events = get_organizer_events(current_user.user_id)
    return [EventResponse(**e) for e in events]
