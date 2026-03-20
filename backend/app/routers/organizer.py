"""Organizer API routes — event management and analytics for organizers."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
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
    
    # Fetch all registrations for organizer's events in a single query (avoid N+1)
    all_regs_response = (
        supabase_admin.table("registrations")
        .select("*")
        .in_("event_id", event_ids)
        .execute()
    )
    all_registrations = all_regs_response.data
    
    # Fetch all expenses for organizer's events in a single query
    all_expenses_response = (
        supabase_admin.table("expenses")
        .select("event_id, amount")
        .in_("event_id", event_ids)
        .execute()
    )
    all_expenses = all_expenses_response.data
    
    # Aggregate from fetched data
    total_revenue = 0.0
    total_expenses = 0.0
    paid_count = 0
    
    for r in all_registrations:
        if r.get("payment_status") == "paid":
            total_revenue += r.get("payment_amount", 0)
            paid_count += 1
    
    for e in all_expenses:
        total_expenses += e.get("amount", 0)
    
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


# --------------------------------------------------------------------------- 
# Participant Management Endpoints
# --------------------------------------------------------------------------- 

@router.get("/participants")
async def list_participants(
    event_id: Optional[str] = Query(None, description="Filter by event ID"),
    status: Optional[str] = Query(None, description="Filter by registration status"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    search: Optional[str] = Query(None, description="Search by participant name or email"),
    limit: int = Query(50, ge=1, le=200, description="Limit number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    List all participants across the organizer's events with filtering and search.
    
    Supports filtering by:
    - event_id: Specific event
    - status: Registration status (pending, confirmed, cancelled)
    - payment_status: Payment status (unpaid, paid, refunded)
    - search: Search by name or email
    
    Returns paginated list of participants with user details.
    """
    user_id = current_user.user_id
    
    # Get all events owned by this organizer
    events = get_organizer_events(user_id)
    event_ids = [e["id"] for e in events]
    
    if not event_ids:
        return {"participants": [], "total": 0, "events": events}
    
    # Build the query
    query = (
        supabase_admin.table("registrations")
        .select("*, users(id, email, first_name, last_name, phone, enrollment_number, branch, college_name), events(id, name, event_type)")
    )
    
    # Apply event filter
    if event_id:
        if event_id not in event_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view participants for this event"
            )
        query = query.eq("event_id", event_id)
    else:
        query = query.in_("event_id", event_ids)
    
    # Apply status filters
    if status:
        query = query.eq("status", status)
    if payment_status:
        query = query.eq("payment_status", payment_status)
    
    # Get total count before pagination
    # Note: For better performance, we could use a separate count query
    all_regs = query.execute()
    total = len(all_regs.data)
    
    # Apply pagination and get user data for search
    regs = (
        supabase_admin.table("registrations")
        .select("*, users(id, email, first_name, last_name, phone, enrollment_number, branch, college_name), events(id, name, event_type)")
    )
    
    # Reapply filters for paginated query
    if event_id:
        regs = regs.eq("event_id", event_id)
    else:
        regs = regs.in_("event_id", event_ids)
    if status:
        regs = regs.eq("status", status)
    if payment_status:
        regs = regs.eq("payment_status", payment_status)
    
    regs = regs.order("registered_at", desc=True).range(offset, offset + limit - 1).execute()
    
    # Filter by search if provided (client-side due to join complexity)
    participants = []
    for r in regs.data:
        user = r.get("users") or {}
        event = r.get("events") or {}
        
        # Search filter
        if search:
            search_lower = search.lower()
            name_match = f"{user.get('first_name', '')} {user.get('last_name', '')}".lower()
            email_match = user.get("email", "").lower()
            if search_lower not in name_match and search_lower not in email_match:
                continue
        
        participants.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "event_id": r["event_id"],
            "event_name": event.get("name"),
            "event_type": event.get("event_type"),
            "status": r["status"],
            "payment_status": r["payment_status"],
            "payment_amount": r.get("payment_amount", 0),
            "qr_code": r.get("qr_code"),
            "checked_in_at": r.get("checked_in_at"),
            "registered_at": r["registered_at"],
            "user": {
                "id": user.get("id"),
                "email": user.get("email"),
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "phone": user.get("phone"),
                "enrollment_number": user.get("enrollment_number"),
                "branch": user.get("branch"),
                "college_name": user.get("college_name"),
            }
        })
    
    # Recalculate total after search filter
    if search:
        total = len(participants)
        participants = participants[:limit]
    
    return {
        "participants": participants,
        "total": total,
        "limit": limit,
        "offset": offset,
        "events": [{"id": e["id"], "name": e["name"], "event_type": e["event_type"], "status": e["status"]} for e in events]
    }


# --------------------------------------------------------------------------- 
# Team Management Endpoints
# --------------------------------------------------------------------------- 

@router.get("/teams")
async def list_teams(
    event_id: Optional[str] = Query(None, description="Filter by event ID"),
    status: Optional[str] = Query(None, description="Filter by team status"),
    search: Optional[str] = Query(None, description="Search by team name"),
    limit: int = Query(50, ge=1, le=200, description="Limit number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    List all teams across the organizer's events with filtering and search.
    
    Supports filtering by:
    - event_id: Specific event
    - status: Team status (registered, confirmed, eliminated, winner)
    - search: Search by team name
    
    Returns paginated list of teams with member details.
    """
    user_id = current_user.user_id
    
    # Get all events owned by this organizer
    events = get_organizer_events(user_id)
    event_ids = [e["id"] for e in events]
    
    if not event_ids:
        return {"teams": [], "total": 0, "events": events}
    
    # Build the query for teams
    query = (
        supabase_admin.table("teams")
        .select("*, events(id, name, event_type), users!teams_captain_id_fkey(id, first_name, last_name, email)")
    )
    
    # Apply event filter
    if event_id:
        if event_id not in event_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view teams for this event"
            )
        query = query.eq("event_id", event_id)
    else:
        query = query.in_("event_id", event_ids)
    
    # Apply status filter
    if status:
        query = query.eq("status", status)
    
    # Get all teams to calculate total
    all_teams = query.execute()
    total = len(all_teams.data)
    
    # Apply pagination
    teams_query = (
        supabase_admin.table("teams")
        .select("*, events(id, name, event_type), users!teams_captain_id_fkey(id, first_name, last_name, email)")
    )
    
    if event_id:
        teams_query = teams_query.eq("event_id", event_id)
    else:
        teams_query = teams_query.in_("event_id", event_ids)
    if status:
        teams_query = teams_query.eq("status", status)
    
    teams_query = teams_query.order("created_at", desc=True).range(offset, offset + limit - 1)
    teams = teams_query.execute()
    
    # Get team members for each team
    team_data = []
    for team in teams.data:
        event = team.get("events") or {}
        captain = team.get("users") or {}
        
        # Get team members
        members_resp = (
            supabase_admin.table("team_members")
            .select("*, users(id, first_name, last_name, email)")
            .eq("team_id", team["id"])
            .execute()
        )
        
        members = []
        for m in members_resp.data:
            user = m.get("users") or {}
            members.append({
                "id": m["id"],
                "user_id": m["user_id"],
                "role": m.get("role"),
                "jersey_number": m.get("jersey_number"),
                "is_active": m.get("is_active"),
                "user": {
                    "id": user.get("id"),
                    "first_name": user.get("first_name"),
                    "last_name": user.get("last_name"),
                    "email": user.get("email"),
                }
            })
        
        # Search filter
        if search:
            search_lower = search.lower()
            team_name = team.get("name", "").lower()
            if search_lower not in team_name:
                continue
        
        team_data.append({
            "id": team["id"],
            "name": team["name"],
            "event_id": team["event_id"],
            "event_name": event.get("name"),
            "event_type": event.get("event_type"),
            "status": team.get("status"),
            "captain_id": team.get("captain_id"),
            "captain": {
                "id": captain.get("id"),
                "first_name": captain.get("first_name"),
                "last_name": captain.get("last_name"),
                "email": captain.get("email"),
            } if captain.get("id") else None,
            "member_count": len(members),
            "members": members,
            "created_at": team.get("created_at"),
        })
    
    # Recalculate total after search filter
    if search:
        total = len(team_data)
        team_data = team_data[:limit]
    
    return {
        "teams": team_data,
        "total": total,
        "limit": limit,
        "offset": offset,
        "events": [{"id": e["id"], "name": e["name"], "event_type": e["event_type"], "status": e["status"]} for e in events]
    }


# --------------------------------------------------------------------------- 
# Expense Tracking Endpoints
# --------------------------------------------------------------------------- 

@router.get("/expenses")
async def list_all_expenses(
    event_id: Optional[str] = Query(None, description="Filter by event ID"),
    category: Optional[str] = Query(None, description="Filter by expense category"),
    min_amount: Optional[float] = Query(None, description="Minimum amount filter"),
    max_amount: Optional[float] = Query(None, description="Maximum amount filter"),
    limit: int = Query(50, ge=1, le=200, description="Limit number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    List all expenses across the organizer's events with filtering.
    
    Supports filtering by:
    - event_id: Specific event
    - category: Expense category
    - min_amount/max_amount: Amount range
    
    Returns paginated list of expenses with category breakdown.
    """
    user_id = current_user.user_id
    
    # Get all events owned by this organizer
    events = get_organizer_events(user_id)
    event_ids = [e["id"] for e in events]
    
    if not event_ids:
        return {
            "expenses": [],
            "total": 0,
            "total_amount": 0,
            "categories": [],
            "events": events
        }
    
    # Build the query
    query = (
        supabase_admin.table("expenses")
        .select("*, events(id, name)")
    )
    
    # Apply event filter
    if event_id:
        if event_id not in event_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view expenses for this event"
            )
        query = query.eq("event_id", event_id)
    else:
        query = query.in_("event_id", event_ids)
    
    # Apply category filter
    if category:
        query = query.eq("category", category)
    
    # Get all for calculating totals
    all_expenses = query.execute()
    total = len(all_expenses.data)
    total_amount = sum(e.get("amount", 0) for e in all_expenses.data)
    
    # Calculate category breakdown
    category_totals = {}
    for e in all_expenses.data:
        cat = e.get("category", "Uncategorized")
        if cat not in category_totals:
            category_totals[cat] = {"count": 0, "total": 0.0}
        category_totals[cat]["count"] += 1
        category_totals[cat]["total"] += e.get("amount", 0)
    
    categories = [
        {"category": cat, "count": data["count"], "total": data["total"]}
        for cat, data in category_totals.items()
    ]
    
    # Apply amount filters and pagination
    expenses_query = (
        supabase_admin.table("expenses")
        .select("*, events(id, name)")
    )
    
    if event_id:
        expenses_query = expenses_query.eq("event_id", event_id)
    else:
        expenses_query = expenses_query.in_("event_id", event_ids)
    if category:
        expenses_query = expenses_query.eq("category", category)
    
    expenses_query = expenses_query.order("date", desc=True).range(offset, offset + limit - 1)
    expenses = expenses_query.execute()
    
    # Format expense data
    expense_data = []
    for e in expenses.data:
        event = e.get("events") or {}
        
        # Apply amount filters
        if min_amount is not None and e.get("amount", 0) < min_amount:
            continue
        if max_amount is not None and e.get("amount", 0) > max_amount:
            continue
        
        expense_data.append({
            "id": e["id"],
            "event_id": e["event_id"],
            "event_name": event.get("name"),
            "category": e.get("category"),
            "description": e.get("description"),
            "amount": e.get("amount", 0),
            "date": e.get("date"),
            "receipt": e.get("receipt"),
            "created_by_id": e.get("created_by_id"),
            "created_at": e.get("created_at"),
        })
    
    return {
        "expenses": expense_data,
        "total": total,
        "total_amount": total_amount,
        "categories": categories,
        "events": [{"id": e["id"], "name": e["name"], "event_type": e["event_type"], "status": e["status"]} for e in events]
    }


# --------------------------------------------------------------------------- 
# Volunteer Management Endpoints
# --------------------------------------------------------------------------- 

@router.get("/volunteers")
async def list_all_volunteers(
    event_id: Optional[str] = Query(None, description="Filter by event ID"),
    status: Optional[str] = Query(None, description="Filter by volunteer status"),
    shift_id: Optional[str] = Query(None, description="Filter by shift ID"),
    limit: int = Query(50, ge=1, le=200, description="Limit number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    List all volunteers across the organizer's events with filtering.
    
    Supports filtering by:
    - event_id: Specific event
    - status: Volunteer status (assigned, on_duty, completed)
    - shift_id: Specific shift
    
    Returns paginated list of volunteers with shift details.
    """
    user_id = current_user.user_id
    
    # Get all events owned by this organizer
    events = get_organizer_events(user_id)
    event_ids = [e["id"] for e in events]
    
    if not event_ids:
        return {
            "volunteers": [],
            "total": 0,
            "shifts": [],
            "events": events
        }
    
    # Build the query for volunteers
    query = (
        supabase_admin.table("volunteers")
        .select("*, users(id, email, first_name, last_name, phone), shifts(*), events(id, name)")
    )
    
    # Apply event filter
    if event_id:
        if event_id not in event_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view volunteers for this event"
            )
        query = query.eq("event_id", event_id)
    else:
        query = query.in_("event_id", event_ids)
    
    # Apply status filter
    if status:
        query = query.eq("status", status)
    
    # Apply shift filter
    if shift_id:
        query = query.eq("shift_id", shift_id)
    
    # Get all to calculate total
    all_volunteers = query.execute()
    total = len(all_volunteers.data)
    
    # Apply pagination
    volunteers_query = (
        supabase_admin.table("volunteers")
        .select("*, users(id, email, first_name, last_name, phone), shifts(*), events(id, name)")
    )
    
    if event_id:
        volunteers_query = volunteers_query.eq("event_id", event_id)
    else:
        volunteers_query = volunteers_query.in_("event_id", event_ids)
    if status:
        volunteers_query = volunteers_query.eq("status", status)
    if shift_id:
        volunteers_query = volunteers_query.eq("shift_id", shift_id)
    
    volunteers_query = volunteers_query.order("created_at", desc=True).range(offset, offset + limit - 1)
    volunteers = volunteers_query.execute()
    
    # Get shifts for the events
    shifts_resp = (
        supabase_admin.table("shifts")
        .select("*")
        .in_("event_id", event_ids)
        .order("start_time")
        .execute()
    )
    shifts = shifts_resp.data
    
    # Format volunteer data
    volunteer_data = []
    for v in volunteers.data:
        user = v.get("users") or {}
        shift = v.get("shifts") or {}
        event = v.get("events") or {}
        
        # Calculate hours worked if completed
        hours_worked = 0
        if v.get("checked_in_at") and v.get("status") == "completed":
            start = shift.get("start_time")
            end = shift.get("end_time")
            if start and end:
                try:
                    start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
                    end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
                    hours_worked = (end_dt - start_dt).total_seconds() / 3600
                except:
                    pass
        
        volunteer_data.append({
            "id": v["id"],
            "user_id": v["user_id"],
            "event_id": v["event_id"],
            "event_name": event.get("name"),
            "shift_id": v["shift_id"],
            "shift_name": shift.get("name"),
            "shift_start": shift.get("start_time"),
            "shift_end": shift.get("end_time"),
            "shift_location": shift.get("location"),
            "role": v.get("role"),
            "status": v.get("status"),
            "checked_in_at": v.get("checked_in_at"),
            "hours_worked": round(hours_worked, 2),
            "created_at": v.get("created_at"),
            "user": {
                "id": user.get("id"),
                "email": user.get("email"),
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "phone": user.get("phone"),
            }
        })
    
    # Get shifts grouped by event
    shifts_by_event = {}
    for s in shifts:
        e_id = s.get("event_id")
        if e_id not in shifts_by_event:
            shifts_by_event[e_id] = []
        shifts_by_event[e_id].append({
            "id": s["id"],
            "name": s.get("name"),
            "start_time": s.get("start_time"),
            "end_time": s.get("end_time"),
            "location": s.get("location"),
            "required_volunteers": s.get("required_volunteers"),
        })
    
    return {
        "volunteers": volunteer_data,
        "total": total,
        "shifts": shifts,
        "shifts_by_event": shifts_by_event,
        "events": [{"id": e["id"], "name": e["name"], "event_type": e["event_type"], "status": e["status"]} for e in events]
    }


@router.post("/volunteers/{volunteer_id}/check-in")
async def check_in_volunteer(
    volunteer_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Check in a volunteer.
    """
    # Get volunteer
    vol_resp = supabase_admin.table("volunteers").select("*, events(organizer_id)").eq("id", volunteer_id).execute()
    
    if not vol_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer not found")
    
    volunteer = vol_resp.data[0]
    event = volunteer.get("events") or {}
    
    # Verify organizer owns the event
    if event.get("organizer_id") != current_user.user_id and current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Update check-in time
    check_in_time = datetime.now(timezone.utc).isoformat()
    
    supabase_admin.table("volunteers").update({
        "checked_in_at": check_in_time,
        "status": "on_duty"
    }).eq("id", volunteer_id).execute()
    
    return {"message": "Volunteer checked in successfully", "checked_in_at": check_in_time}


@router.post("/volunteers/{volunteer_id}/complete")
async def complete_volunteer_shift(
    volunteer_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Complete a volunteer shift.
    """
    # Get volunteer
    vol_resp = supabase_admin.table("volunteers").select("*, events(organizer_id), shifts(*)").eq("id", volunteer_id).execute()
    
    if not vol_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer not found")
    
    volunteer = vol_resp.data[0]
    event = volunteer.get("events") or {}
    shift = volunteer.get("shifts") or {}
    
    # Verify organizer owns the event
    if event.get("organizer_id") != current_user.user_id and current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Calculate hours worked
    hours_worked = 0
    check_in = volunteer.get("checked_in_at")
    shift_end = shift.get("end_time")
    
    if check_in and shift_end:
        try:
            start_dt = datetime.fromisoformat(check_in.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(shift_end.replace('Z', '+00:00'))
            hours_worked = (end_dt - start_dt).total_seconds() / 3600
        except:
            pass
    
    # Update status to completed
    supabase_admin.table("volunteers").update({
        "status": "completed",
        "hours_worked": round(hours_worked, 2)
    }).eq("id", volunteer_id).execute()
    
    return {"message": "Shift completed successfully", "hours_worked": round(hours_worked, 2)}
