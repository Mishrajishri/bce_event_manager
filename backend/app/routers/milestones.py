"""
Milestones Router - Phase 6.3: Progress Tracking
Provides API endpoints for hackathon milestone management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from typing import List, Optional
from datetime import datetime, timedelta

from app.supabase import supabase_admin
from app.auth import get_current_user, CurrentUser
from app.models.schemas import (
    MilestoneCreate,
    MilestoneUpdate,
    MilestoneResponse,
    TeamMilestoneUpdate,
    TeamMilestoneResponse,
    MilestoneSubmissionCreate,
    MilestoneSubmissionResponse,
    MilestoneReminderCreate,
    MilestoneReminderResponse,
    TeamMilestoneProgress,
)

router = APIRouter(prefix="/milestones", tags=["milestones"])


# ============================================
# Event Milestones (Organizer endpoints)
# ============================================

@router.post("/events/{event_id}/milestones", response_model=MilestoneResponse)
async def create_milestone(
    event_id: str,
    milestone: MilestoneCreate,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new milestone for an event (organizers only)."""
    # Check if user is organizer for this event
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can create milestones")
    
    data = milestone.model_dump()
    data["event_id"] = event_id
    
    result = supabase.table("event_milestones").insert(data).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return result.data[0]


@router.get("/events/{event_id}/milestones", response_model=List[MilestoneResponse])
async def list_event_milestones(
    event_id: str,
    supabase: Client = Depends(lambda: supabase_admin)
):
    """List all milestones for an event."""
    response = supabase.table("event_milestones").select("*").eq("event_id", event_id).order("sequence_order").execute()
    return response.data or []


@router.get("/events/{event_id}/milestones/{milestone_id}", response_model=MilestoneResponse)
async def get_milestone(
    event_id: str,
    milestone_id: str,
    supabase: Client = Depends(lambda: supabase_admin)
):
    """Get a specific milestone."""
    response = supabase.table("event_milestones").select("*").eq("id", milestone_id).eq("event_id", event_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return response.data[0]


@router.put("/events/{event_id}/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    event_id: str,
    milestone_id: str,
    milestone: MilestoneUpdate,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a milestone (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can update milestones")
    
    data = milestone.model_dump(exclude_unset=True)
    data["updated_at"] = datetime.utcnow().isoformat()
    
    result = supabase.table("event_milestones").update(data).eq("id", milestone_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return result.data[0]


@router.delete("/events/{event_id}/milestones/{milestone_id}")
async def delete_milestone(
    event_id: str,
    milestone_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a milestone (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can delete milestones")
    
    result = supabase.table("event_milestones").delete().eq("id", milestone_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return {"message": "Milestone deleted successfully"}


# ============================================
# Team Milestones (Team member endpoints)
# ============================================

@router.get("/teams/{team_id}/milestones", response_model=List[TeamMilestoneResponse])
async def list_team_milestones(
    team_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List all milestones for a team."""
    # Verify user is a team member
    member_response = supabase.table("team_members").select("*").eq("team_id", team_id).eq("user_id", current_user.user_id).execute()
    
    if not member_response.data:
        raise HTTPException(status_code=403, detail="Only team members can view milestones")
    
    # Get the event_id for the team
    team_response = supabase.table("teams").select("event_id").eq("id", team_id).execute()
    if not team_response.data:
        raise HTTPException(status_code=404, detail="Team not found")
    
    event_id = team_response.data[0]["event_id"]
    
    # Get team milestones with milestone details
    response = supabase.table("team_milestones").select("""
        id,
        team_id,
        milestone_id,
        status,
        submission_link,
        submission_notes,
        submitted_at,
        reviewed_by,
        reviewed_at,
        feedback,
        points_earned,
        created_at,
        updated_at,
        event_milestones!inner(
            name,
            due_date,
            point_value,
            is_required,
            description
        )
    """).eq("team_id", team_id).execute()
    
    # Transform the response
    milestones = []
    for item in (response.data or []):
        milestone_data = {
            "id": item["id"],
            "team_id": item["team_id"],
            "milestone_id": item["milestone_id"],
            "status": item["status"],
            "submission_link": item.get("submission_link"),
            "submission_notes": item.get("submission_notes"),
            "submitted_at": item.get("submitted_at"),
            "reviewed_by": item.get("reviewed_by"),
            "reviewed_at": item.get("reviewed_at"),
            "feedback": item.get("feedback"),
            "points_earned": item["points_earned"],
            "created_at": item["created_at"],
            "updated_at": item.get("updated_at"),
            "milestone_name": item["event_milestones"]["name"],
            "milestone_due_date": item["event_milestones"]["due_date"],
            "milestone_point_value": item["event_milestones"]["point_value"],
            "milestone_is_required": item["event_milestones"]["is_required"],
        }
        milestones.append(milestone_data)
    
    return milestones


@router.put("/teams/{team_id}/milestones/{milestone_id}", response_model=TeamMilestoneResponse)
async def update_team_milestone(
    team_id: str,
    milestone_id: str,
    update_data: TeamMilestoneUpdate,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a team milestone (submit work, add notes)."""
    # Verify user is a team member
    member_response = supabase.table("team_members").select("*").eq("team_id", team_id).eq("user_id", current_user.user_id).execute()
    
    if not member_response.data:
        raise HTTPException(status_code=403, detail="Only team members can update milestones")
    
    # Get current milestone status
    current = supabase.table("team_milestones").select("*").eq("id", milestone_id).eq("team_id", team_id).execute()
    
    if not current.data:
        raise HTTPException(status_code=404, detail="Team milestone not found")
    
    current_data = current.data[0]
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Auto-update timestamps based on status
    if update_dict.get("status") == "submitted" and current_data["status"] != "submitted":
        update_dict["submitted_at"] = datetime.utcnow().isoformat()
    
    update_dict["updated_at"] = datetime.utcnow().isoformat()
    
    result = supabase.table("team_milestones").update(update_dict).eq("id", milestone_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    # Get milestone details for response
    milestone_response = supabase.table("event_milestones").select("*").eq("id", current_data["milestone_id"]).execute()
    milestone_info = milestone_response.data[0] if milestone_response.data else {}
    
    return {
        **result.data[0],
        "milestone_name": milestone_info.get("name"),
        "milestone_due_date": milestone_info.get("due_date"),
        "milestone_point_value": milestone_info.get("point_value"),
        "milestone_is_required": milestone_info.get("is_required"),
    }


@router.get("/teams/{team_id}/progress", response_model=TeamMilestoneProgress)
async def get_team_progress(
    team_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get progress summary for a team's milestones."""
    # Verify user is a team member
    member_response = supabase.table("team_members").select("*").eq("team_id", team_id).eq("user_id", current_user.user_id).execute()
    
    if not member_response.data:
        raise HTTPException(status_code=403, detail="Only team members can view progress")
    
    # Get all team milestones
    response = supabase.table("team_milestones").select("""
        status,
        points_earned,
        event_milestones!inner(due_date, point_value)
    """).eq("team_id", team_id).execute()
    
    now = datetime.utcnow()
    total_milestones = len(response.data or [])
    completed = sum(1 for m in (response.data or []) if m["status"] == "approved")
    pending = sum(1 for m in (response.data or []) if m["status"] == "pending")
    in_progress = sum(1 for m in (response.data or []) if m["status"] == "in_progress")
    submitted = sum(1 for m in (response.data or []) if m["status"] == "submitted")
    total_points = sum(m.get("event_milestones", {}).get("point_value", 0) for m in (response.data or []))
    earned_points = sum(m.get("points_earned", 0) for m in (response.data or []))
    
    # Count overdue
    overdue = 0
    for m in (response.data or []):
        due_date = m.get("event_milestones", {}).get("due_date")
        if due_date and m["status"] not in ["approved", "submitted"]:
            due_dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
            if due_dt < now:
                overdue += 1
    
    return TeamMilestoneProgress(
        total_milestones=total_milestones,
        completed_milestones=completed,
        pending_milestones=pending,
        in_progress_milestones=in_progress,
        submitted_milestones=submitted,
        total_points=total_points,
        earned_points=earned_points,
        overdue_count=overdue
    )


# ============================================
# Milestone Submissions (Checkpoint submissions)
# ============================================

@router.post("/team-milestones/{team_milestone_id}/submissions", response_model=MilestoneSubmissionResponse)
async def create_milestone_submission(
    team_milestone_id: str,
    submission: MilestoneSubmissionCreate,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Submit work for a milestone checkpoint."""
    # Verify ownership via team_milestones
    tm_response = supabase.table("team_milestones").select("team_id, milestone_id").eq("id", team_milestone_id).execute()
    
    if not tm_response.data:
        raise HTTPException(status_code=404, detail="Team milestone not found")
    
    team_id = tm_response.data[0]["team_id"]
    
    # Verify user is team member
    member_response = supabase.table("team_members").select("*").eq("team_id", team_id).eq("user_id", current_user.user_id).execute()
    
    if not member_response.data:
        raise HTTPException(status_code=403, detail="Only team members can submit")
    
    # Check if there's an existing current submission to increment version
    existing = supabase.table("milestone_submissions").select("version").eq("team_milestone_id", team_milestone_id).eq("is_current", True).execute()
    version = (existing.data[0]["version"] + 1) if existing.data else 1
    
    # Mark all previous submissions as not current
    if existing.data:
        supabase.table("milestone_submissions").update({"is_current": False}).eq("team_milestone_id", team_milestone_id).execute()
    
    data = submission.model_dump()
    data["team_milestone_id"] = team_milestone_id
    data["submitted_by"] = current_user.user_id
    data["version"] = version
    data["is_current"] = True
    
    result = supabase.table("milestone_submissions").insert(data).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    # Update team milestone status to submitted
    supabase.table("team_milestones").update({
        "status": "submitted",
        "submission_link": data.get("submission_url"),
        "submitted_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", team_milestone_id).execute()
    
    return result.data[0]


@router.get("/team-milestones/{team_milestone_id}/submissions", response_model=List[MilestoneSubmissionResponse])
async def list_milestone_submissions(
    team_milestone_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List all submissions for a milestone."""
    # Get team_id from team_milestone
    tm_response = supabase.table("team_milestones").select("team_id").eq("id", team_milestone_id).execute()
    
    if not tm_response.data:
        raise HTTPException(status_code=404, detail="Team milestone not found")
    
    team_id = tm_response.data[0]["team_id"]
    
    # Verify user is team member
    member_response = supabase.table("team_members").select("*").eq("team_id", team_id).eq("user_id", current_user.user_id).execute()
    
    if not member_response.data:
        raise HTTPException(status_code=403, detail="Only team members can view submissions")
    
    response = supabase.table("milestone_submissions").select("*").eq("team_milestone_id", team_milestone_id).order("version", desc=True).execute()
    
    return response.data or []


# ============================================
# Organizer: Review Team Milestones
# ============================================

@router.put("/events/{event_id}/teams/{team_id}/milestones/{milestone_id}/review", response_model=TeamMilestoneResponse)
async def review_team_milestone(
    event_id: str,
    team_id: str,
    milestone_id: str,
    review_data: dict,  # { "status": "approved|rejected", "feedback": "...", "points_earned": 10 }
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Review a team milestone submission (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can review milestones")
    
    # Find the team milestone
    tm_response = supabase.table("team_milestones").select("*").eq("milestone_id", milestone_id).eq("team_id", team_id).execute()
    
    if not tm_response.data:
        raise HTTPException(status_code=404, detail="Team milestone not found")
    
    team_milestone_id = tm_response.data[0]["id"]
    
    update_data = {
        "status": review_data.get("status", "approved"),
        "reviewed_by": current_user.user_id,
        "reviewed_at": datetime.utcnow().isoformat(),
        "feedback": review_data.get("feedback"),
        "points_earned": review_data.get("points_earned", 0),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("team_milestones").update(update_data).eq("id", team_milestone_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    # Get milestone details
    milestone_response = supabase.table("event_milestones").select("*").eq("id", milestone_id).execute()
    milestone_info = milestone_response.data[0] if milestone_response.data else {}
    
    return {
        **result.data[0],
        "milestone_name": milestone_info.get("name"),
        "milestone_due_date": milestone_info.get("due_date"),
        "milestone_point_value": milestone_info.get("point_value"),
        "milestone_is_required": milestone_info.get("is_required"),
    }


@router.get("/events/{event_id}/teams/{team_id}/milestones", response_model=List[TeamMilestoneResponse])
async def list_team_milestones_for_organizer(
    event_id: str,
    team_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List all team milestones for an event (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can view team milestones")
    
    # Get team milestones with details
    tm_response = supabase.table("team_milestones").select("""
        id,
        team_id,
        milestone_id,
        status,
        submission_link,
        submission_notes,
        submitted_at,
        reviewed_by,
        reviewed_at,
        feedback,
        points_earned,
        created_at,
        updated_at,
        event_milestones!inner(
            name,
            due_date,
            point_value,
            is_required,
            description
        )
    """).eq("team_id", team_id).execute()
    
    milestones = []
    for item in (tm_response.data or []):
        milestone_data = {
            "id": item["id"],
            "team_id": item["team_id"],
            "milestone_id": item["milestone_id"],
            "status": item["status"],
            "submission_link": item.get("submission_link"),
            "submission_notes": item.get("submission_notes"),
            "submitted_at": item.get("submitted_at"),
            "reviewed_by": item.get("reviewed_by"),
            "reviewed_at": item.get("reviewed_at"),
            "feedback": item.get("feedback"),
            "points_earned": item["points_earned"],
            "created_at": item["created_at"],
            "updated_at": item.get("updated_at"),
            "milestone_name": item["event_milestones"]["name"],
            "milestone_due_date": item["event_milestones"]["due_date"],
            "milestone_point_value": item["event_milestones"]["point_value"],
            "milestone_is_required": item["event_milestones"]["is_required"],
        }
        milestones.append(milestone_data)
    
    return milestones


# ============================================
# Milestone Reminders (Automated reminders)
# ============================================

@router.post("/reminders", response_model=MilestoneReminderResponse)
async def create_reminder(
    reminder: MilestoneReminderCreate,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a reminder for a milestone."""
    # Verify user owns this milestone
    tm_response = supabase.table("team_milestones").select("team_id").eq("id", reminder.team_milestone_id).execute()
    
    if not tm_response.data:
        raise HTTPException(status_code=404, detail="Team milestone not found")
    
    team_id = tm_response.data[0]["team_id"]
    
    # Check team membership
    member_response = supabase.table("team_members").select("*").eq("team_id", team_id).eq("user_id", current_user.user_id).execute()
    
    if not member_response.data and reminder.reminder_type != "custom":
        raise HTTPException(status_code=403, detail="Cannot create reminder for this milestone")
    
    data = reminder.model_dump(exclude_unset=True)
    
    # If scheduled_for is not provided, calculate based on milestone due date
    if not data.get("scheduled_for"):
        milestone_response = supabase.table("event_milestones").select("due_date").eq("id", 
            supabase.table("team_milestones").select("milestone_id").eq("id", reminder.team_milestone_id).execute().data[0]["milestone_id"]
        ).execute()
        
        if milestone_response.data:
            due_date = datetime.fromisoformat(milestone_response.data[0]["due_date"].replace("Z", "+00:00"))
            if reminder.reminder_type == "due_soon":
                data["scheduled_for"] = (due_date - timedelta(days=1)).isoformat()
            elif reminder.reminder_type == "overdue":
                data["scheduled_for"] = (due_date + timedelta(hours=1)).isoformat()
    
    result = supabase.table("milestone_reminders").insert(data).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return result.data[0]


@router.get("/teams/{team_id}/reminders", response_model=List[MilestoneReminderResponse])
async def list_team_reminders(
    team_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List reminders for a team's milestones."""
    # Verify membership
    member_response = supabase.table("team_members").select("*").eq("team_id", team_id).eq("user_id", current_user.user_id).execute()
    
    if not member_response.data:
        raise HTTPException(status_code=403, detail="Only team members can view reminders")
    
    # Get team milestone IDs
    tm_response = supabase.table("team_milestones").select("id").eq("team_id", team_id).execute()
    milestone_ids = [tm["id"] for tm in (tm_response.data or [])]
    
    if not milestone_ids:
        return []
    
    response = supabase.table("milestone_reminders").select("*").in_("team_milestone_id", milestone_ids).order("scheduled_for").execute()
    
    return response.data or []
