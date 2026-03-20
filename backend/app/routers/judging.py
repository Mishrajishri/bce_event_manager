"""Judging System Router - Multi-judge panel management, conflict detection, peer review, public voting."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime

from ..models.schemas import (
    JudgePanelCreate,
    JudgePanelResponse,
    PanelJudgeCreate,
    JudgeAssignmentCreate,
    JudgeConflictCreate,
    PeerReviewCreate,
    PublicVoteCreate,
    DemoSessionCreate,
)
from ..auth import CurrentUser, require_any_user
from ..supabase import supabase_admin

router = APIRouter(prefix="/judging", tags=["Judging System"])


# ========================
# Judge Panels
# ========================

@router.post("/panels", response_model=JudgePanelResponse, status_code=status.HTTP_201_CREATED)
async def create_judge_panel(
    panel: JudgePanelCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Create a new judge panel for an event."""
    # Verify event exists and user has permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", panel.event_id).execute()
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    is_organizer = event_response.data[0]["organizer_id"] == current_user.user_id
    is_admin = current_user.role in ("super_admin", "admin")
    
    if not is_organizer and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event organizers can create judge panels"
        )
    
    data = {
        "event_id": panel.event_id,
        "name": panel.name,
        "description": panel.description,
        "created_by": current_user.user_id,
    }
    
    response = supabase_admin.table("judge_panels").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/panels/event/{event_id}", response_model=List[JudgePanelResponse])
async def list_judge_panels(
    event_id: str,
    current_user: Optional[CurrentUser] = Depends(require_any_user),
):
    """List all judge panels for an event."""
    response = supabase_admin.table("judge_panels").select("*").eq("event_id", event_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


@router.get("/panels/{panel_id}", response_model=JudgePanelResponse)
async def get_judge_panel(
    panel_id: str,
    current_user: Optional[CurrentUser] = Depends(require_any_user),
):
    """Get a specific judge panel with its judges."""
    panel_response = supabase_admin.table("judge_panels").select("*").eq("id", panel_id).execute()
    if not panel_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Panel not found"
        )
    
    panel = panel_response.data[0]
    
    # Get judges in this panel
    judges_response = supabase_admin.table("panel_judges").select("*").eq("panel_id", panel_id).execute()
    panel["judges"] = judges_response.data if judges_response.data else []
    
    return panel


@router.post("/panels/{panel_id}/judges", status_code=status.HTTP_201_CREATED)
async def add_judge_to_panel(
    panel_id: str,
    judge_data: PanelJudgeCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Add a judge to a panel."""
    # Verify panel exists
    panel_response = supabase_admin.table("judge_panels").select("*").eq("id", panel_id).execute()
    if not panel_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Panel not found"
        )
    
    # Check permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", panel_response.data[0]["event_id"]).execute()
    is_organizer = event_response.data and event_response.data[0]["organizer_id"] == current_user.user_id
    is_admin = current_user.role in ("super_admin", "admin")
    
    if not is_organizer and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event organizers can add judges to panels"
        )
    
    # Verify user exists
    user_response = supabase_admin.table("users").select("id").eq("id", judge_data.user_id).execute()
    if not user_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    data = {
        "panel_id": panel_id,
        "user_id": judge_data.user_id,
        "role": judge_data.role or "judge",
    }
    
    response = supabase_admin.table("panel_judges").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.delete("/panels/{panel_id}/judges/{user_id}")
async def remove_judge_from_panel(
    panel_id: str,
    user_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Remove a judge from a panel."""
    panel_response = supabase_admin.table("judge_panels").select("*").eq("id", panel_id).execute()
    if not panel_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Panel not found"
        )
    
    # Check permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", panel_response.data[0]["event_id"]).execute()
    is_organizer = event_response.data and event_response.data[0]["organizer_id"] == current_user.user_id
    is_admin = current_user.role in ("super_admin", "admin")
    
    if not is_organizer and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event organizers can remove judges from panels"
        )
    
    response = supabase_admin.table("panel_judges").delete().eq("panel_id", panel_id).eq("user_id", user_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return {"message": "Judge removed from panel"}


# ========================
# Judge Assignments
# ========================

@router.post("/assignments")
async def assign_judge_to_submission(
    assignment: JudgeAssignmentCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Assign a judge to evaluate a submission."""
    # Verify submission exists
    sub_response = supabase_admin.table("project_submissions").select("id, event_id").eq("id", assignment.submission_id).execute()
    if not sub_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    event_id = sub_response.data[0]["event_id"]
    
    # Check permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    is_organizer = event_response.data and event_response.data[0]["organizer_id"] == current_user.user_id
    is_admin = current_user.role in ("super_admin", "admin")
    
    if not is_organizer and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event organizers can assign judges"
        )
    
    data = {
        "panel_id": assignment.panel_id,
        "submission_id": assignment.submission_id,
        "judge_id": assignment.judge_id,
        "status": "pending",
    }
    
    response = supabase_admin.table("judge_assignments").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/assignments/judge/{judge_id}")
async def get_judge_assignments(
    judge_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get all submissions assigned to a judge."""
    if current_user.user_id != judge_id and current_user.role not in ("super_admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own assignments"
        )
    
    response = supabase_admin.table("judge_assignments").select(
        "*, project_submissions(id, title, description, github_url, demo_video_url, tech_stack)"
    ).eq("judge_id", judge_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


@router.put("/assignments/{assignment_id}/status")
async def update_assignment_status(
    assignment_id: str,
    status: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Update the status of a judge assignment."""
    # Get assignment
    assignment_response = supabase_admin.table("judge_assignments").select("*").eq("id", assignment_id).execute()
    if not assignment_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check permission
    if assignment_response.data[0]["judge_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own assignments"
        )
    
    data = {"status": status}
    if status == "completed":
        data["completed_at"] = datetime.utcnow().isoformat()
    
    response = supabase_admin.table("judge_assignments").update(data).eq("id", assignment_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


# ========================
# Conflict of Interest
# ========================

@router.post("/conflicts", status_code=status.HTTP_201_CREATED)
async def report_conflict(
    conflict: JudgeConflictCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Report a conflict of interest for a judge."""
    data = {
        "judge_id": conflict.judge_id,
        "submission_id": conflict.submission_id,
        "conflict_type": conflict.conflict_type,
        "description": conflict.description,
    }
    
    response = supabase_admin.table("judge_conflicts").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/conflicts/event/{event_id}")
async def get_event_conflicts(
    event_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get all conflicts for an event."""
    # Check permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    is_organizer = event_response.data and event_response.data[0]["organizer_id"] == current_user.user_id
    is_admin = current_user.role in ("super_admin", "admin")
    
    if not is_organizer and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event organizers can view conflicts"
        )
    
    # Get submissions for this event
    subs_response = supabase_admin.table("project_submissions").select("id").eq("event_id", event_id).execute()
    if not subs_response.data:
        return []
    
    submission_ids = [s["id"] for s in subs_response.data]
    
    response = supabase_admin.table("judge_conflicts").select("*").in_("submission_id", submission_ids).execute()
    
    return response.data if response.data else []


@router.get("/conflicts/check/{submission_id}")
async def check_conflicts(
    submission_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Check for conflicts of interest for a submission."""
    # Get submission and its team members
    sub_response = supabase_admin.table("project_submissions").select("*, teams(id, team_members)").eq("id", submission_id).execute()
    if not sub_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    submission = sub_response.data[0]
    team_id = submission.get("team_id")
    
    if not team_id:
        return {"conflicts": [], "message": "No team associated with this submission"}
    
    # Get team members
    members_response = supabase_admin.table("team_members").select("user_id").eq("team_id", team_id).execute()
    member_ids = [m["user_id"] for m in members_response.data] if members_response.data else []
    
    # Get team captain
    team_response = supabase_admin.table("teams").select("captain_id").eq("id", team_id).execute()
    if team_response.data:
        member_ids.append(team_response.data[0]["captain_id"])
    
    # Check if current user is a team member
    is_team_member = current_user.user_id in member_ids
    
    # Get all judges assigned to this submission
    assignments_response = supabase_admin.table("judge_assignments").select("judge_id").eq("submission_id", submission_id).execute()
    judge_ids = [a["judge_id"] for a in assignments_response.data] if assignments_response.data else []
    
    # Check for conflicts
    conflicts = []
    if is_team_member:
        conflicts.append({
            "type": "team_member",
            "message": "You are a member of this team"
        })
    
    if current_user.user_id in judge_ids:
        conflicts.append({
            "type": "assigned_judge",
            "message": "You are assigned to judge this submission"
        })
    
    return {
        "conflicts": conflicts,
        "is_team_member": is_team_member,
        "is_assigned_judge": current_user.user_id in judge_ids
    }


# ========================
# Peer Reviews
# ========================

@router.post("/peer-reviews", status_code=status.HTTP_201_CREATED)
async def submit_peer_review(
    review: PeerReviewCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Submit a peer review for a submission."""
    # Check if user has registered for the event
    sub_response = supabase_admin.table("project_submissions").select("event_id, team_id").eq("id", review.submission_id).execute()
    if not sub_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    event_id = sub_response.data[0]["event_id"]
    
    # Check if user is registered for this event
    reg_response = supabase_admin.table("registrations").select("id").eq("event_id", event_id).eq("user_id", current_user.user_id).eq("status", "confirmed").execute()
    if not reg_response.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be registered for this event to submit peer reviews"
        )
    
    data = {
        "submission_id": review.submission_id,
        "reviewer_id": current_user.user_id,
        "rating": review.rating,
        "feedback": review.feedback,
    }
    
    response = supabase_admin.table("peer_reviews").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/peer-reviews/submission/{submission_id}")
async def get_peer_reviews(
    submission_id: str,
    current_user: Optional[CurrentUser] = Depends(require_any_user),
):
    """Get peer reviews for a submission."""
    response = supabase_admin.table("peer_reviews").select("*").eq("submission_id", submission_id).execute()
    
    return response.data if response.data else []


# ========================
# Public Voting
# ========================

@router.post("/votes", status_code=status.HTTP_201_CREATED)
async def submit_public_vote(
    vote: PublicVoteCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Submit a public vote for a submission."""
    # Check if user has registered for the event
    sub_response = supabase_admin.table("project_submissions").select("event_id").eq("id", vote.submission_id).execute()
    if not sub_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    event_id = sub_response.data[0]["event_id"]
    
    # Check if user is registered for this event
    reg_response = supabase_admin.table("registrations").select("id").eq("event_id", event_id).eq("user_id", current_user.user_id).eq("status", "confirmed").execute()
    if not reg_response.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be registered for this event to vote"
        )
    
    # Check if user already voted
    existing_vote = supabase_admin.table("public_votes").select("id").eq("submission_id", vote.submission_id).eq("voter_id", current_user.user_id).execute()
    if existing_vote.data:
        # Update existing vote
        response = supabase_admin.table("public_votes").update({"vote_value": vote.vote_value}).eq("id", existing_vote.data[0]["id"]).execute()
    else:
        # Create new vote
        data = {
            "submission_id": vote.submission_id,
            "voter_id": current_user.user_id,
            "vote_value": vote.vote_value,
        }
        response = supabase_admin.table("public_votes").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0] if response.data else {"message": "Vote updated"}


@router.get("/votes/submission/{submission_id}")
async def get_public_votes(
    submission_id: str,
    current_user: Optional[CurrentUser] = Depends(require_any_user),
):
    """Get vote counts for a submission."""
    response = supabase_admin.table("public_votes").select("vote_value").eq("submission_id", submission_id).execute()
    
    votes = response.data if response.data else []
    total_votes = len(votes)
    vote_sum = sum(v.get("vote_value", 1) for v in votes)
    average_rating = vote_sum / total_votes if total_votes > 0 else 0
    
    # Check if current user has voted
    user_voted = False
    user_vote_value = 0
    if current_user:
        user_vote = next((v for v in votes if v.get("voter_id") == current_user.user_id), None)
        if user_vote:
            user_voted = True
            user_vote_value = user_vote.get("vote_value", 1)
    
    return {
        "total_votes": total_votes,
        "average_rating": round(average_rating, 2),
        "user_voted": user_voted,
        "user_vote_value": user_vote_value,
    }


# ========================
# Demo Sessions
# ========================

@router.post("/demo-sessions", status_code=status.HTTP_201_CREATED)
async def create_demo_session(
    session: DemoSessionCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Create a demo session for a submission."""
    # Verify submission exists
    sub_response = supabase_admin.table("project_submissions").select("event_id").eq("id", session.submission_id).execute()
    if not sub_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    event_id = sub_response.data[0]["event_id"]
    
    # Check permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    is_organizer = event_response.data and event_response.data[0]["organizer_id"] == current_user.user_id
    is_admin = current_user.role in ("super_admin", "admin")
    
    if not is_organizer and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event organizers can create demo sessions"
        )
    
    data = {
        "event_id": event_id,
        "submission_id": session.submission_id,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "status": "scheduled",
        "notes": session.notes,
    }
    
    response = supabase_admin.table("demo_sessions").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/demo-sessions/event/{event_id}")
async def list_demo_sessions(
    event_id: str,
    current_user: Optional[CurrentUser] = Depends(require_any_user),
):
    """List all demo sessions for an event."""
    response = supabase_admin.table("demo_sessions").select(
        "*, project_submissions(id, title, team_id)"
    ).eq("event_id", event_id).order("start_time").execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data if response.data else []


@router.put("/demo-sessions/{session_id}/status")
async def update_demo_session_status(
    session_id: str,
    status: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Update the status of a demo session."""
    session_response = supabase_admin.table("demo_sessions").select("*, events(organizer_id)").eq("id", session_id).execute()
    if not session_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session = session_response.data[0]
    
    # Check permission
    is_organizer = session.get("events", {}).get("organizer_id") == current_user.user_id
    is_admin = current_user.role in ("super_admin", "admin")
    
    if not is_organizer and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event organizers can update demo sessions"
        )
    
    data = {"status": status}
    if status == "completed" and not session.get("end_time"):
        data["end_time"] = datetime.utcnow().isoformat()
    
    response = supabase_admin.table("demo_sessions").update(data).eq("id", session_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]
