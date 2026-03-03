
"""Technical Events API routes (Submissions, Judging)."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.models import (
    ProjectSubmissionCreate,
    ProjectSubmissionUpdate,
    ProjectSubmissionResponse,
    JudgingRubricCreate,
    JudgingRubricResponse,
    SubmissionScoreCreate,
    SubmissionScoreResponse,
    TeamRequestCreate,
    TeamRequestUpdate,
    TeamRequestResponse,
    MentorResponse,
    MentorshipSlotResponse,
    MentorshipBookingCreate,
    MentorshipBookingResponse,
)
from app.auth import CurrentUser, require_organizer, require_captain, get_current_user
from app.supabase import supabase_admin
from datetime import datetime, timezone
import logging
import uuid
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tech", tags=["Tech Events"])

# ---------------------------------------------------------------------------
# Project Submissions
# ---------------------------------------------------------------------------

@router.post("/submissions", response_model=ProjectSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_project(
    submission: ProjectSubmissionCreate,
    current_user: CurrentUser = Depends(require_captain),
):
    """
    Submit a project for a technical event.
    Only team captains can submit.
    """
    # 1. Verify team membership and captain status
    team_res = supabase_admin.table("teams").select("id, captain_id, event_id").eq("id", submission.team_id).execute()
    if not team_res.data:
        raise HTTPException(status_code=404, detail="Team not found")
    
    team = team_res.data[0]
    if team["captain_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the team captain can submit the project")

    # 2. Check registration deadline
    event_res = supabase_admin.table("events").select("registration_deadline").eq("id", submission.event_id).execute()
    if not event_res.data:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # 3. Normalize Tech Stack and Validate GitHub URL
    data = submission.model_dump()
    if submission.tech_stack:
        data["tech_stack"] = list(set(s.strip().title() for s in submission.tech_stack if s.strip()))
    
    if submission.github_url:
        parsed = urlparse(submission.github_url)
        if parsed.scheme != "https" or parsed.netloc != "github.com":
            raise HTTPException(status_code=400, detail="Invalid GitHub URL. Must be from https://github.com")

    # 4. Insert or update submission (upsert logic)
    data["status"] = "submitted"
    data["submitted_at"] = datetime.now(timezone.utc).isoformat()
    
    # Check if already exists to manage duplicates manually if needed, 
    # but the DB unique constraint handles it.
    response = supabase_admin.table("project_submissions").upsert(data, on_conflict="event_id,team_id").execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to submit project")

    return ProjectSubmissionResponse(**response.data[0])

@router.get("/events/{event_id}/submissions", response_model=List[ProjectSubmissionResponse])
async def list_submissions(event_id: str):
    """List all project submissions for an event."""
    response = supabase_admin.table("project_submissions").select("*").eq("event_id", event_id).execute()
    return [ProjectSubmissionResponse(**item) for item in response.data]

@router.put("/submissions/{submission_id}", response_model=ProjectSubmissionResponse)
async def update_submission(
    submission_id: str,
    update_data: ProjectSubmissionUpdate,
    current_user: CurrentUser = Depends(require_captain),
):
    """Update an existing project submission."""
    # Check ownership
    sub_res = supabase_admin.table("project_submissions").select("*").eq("id", submission_id).execute()
    if not sub_res.data:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    sub = sub_res.data[0]
    team_res = supabase_admin.table("teams").select("captain_id").eq("id", sub["team_id"]).execute()
    if team_res.data[0]["captain_id"] != current_user.user_id:
         raise HTTPException(status_code=403, detail="Not authorized to update this submission")

    data = update_data.model_dump(exclude_unset=True)
    
    # Normalize and validate if present
    if update_data.tech_stack:
        data["tech_stack"] = list(set(s.strip().title() for s in update_data.tech_stack if s.strip()))
    
    if update_data.github_url and not update_data.github_url.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="Invalid GitHub URL. Must start with https://github.com/")

    response = supabase_admin.table("project_submissions").update(data).eq("id", submission_id).execute()
    
    return ProjectSubmissionResponse(**response.data[0])

# ---------------------------------------------------------------------------
# Judging Rubrics
# ---------------------------------------------------------------------------

@router.post("/events/{event_id}/rubrics", response_model=JudgingRubricResponse, status_code=status.HTTP_201_CREATED)
async def create_rubric(
    event_id: str,
    rubric: JudgingRubricCreate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Create a judging rubric for an event."""
    # Ownership is handled by RLS, but we can double check or just execute
    data = rubric.model_dump()
    data["event_id"] = event_id
    response = supabase_admin.table("judging_rubrics").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create rubric")
    return JudgingRubricResponse(**response.data[0])

@router.get("/events/{event_id}/rubrics", response_model=List[JudgingRubricResponse])
async def list_rubrics(event_id: str):
    """List all rubrics for an event."""
    response = supabase_admin.table("judging_rubrics").select("*").eq("event_id", event_id).order("display_order").execute()
    return [JudgingRubricResponse(**item) for item in response.data]

# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

@router.post("/submissions/{submission_id}/scores", response_model=SubmissionScoreResponse)
async def score_submission(
    submission_id: str,
    score_data: SubmissionScoreCreate,
    current_user: CurrentUser = Depends(require_organizer), # Assuming organizers can judge or we'll add a 'judge' role
):
    """Add or update a score for a submission and rubric criterion."""
    data = score_data.model_dump()
    data["submission_id"] = submission_id
    data["judge_id"] = current_user.user_id
    
    response = supabase_admin.table("submission_scores").upsert(data, on_conflict="submission_id,judge_id,rubric_id").execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save score")
    return SubmissionScoreResponse(**response.data[0])

@router.get("/events/{event_id}/leaderboard")
async def get_tech_leaderboard(event_id: str):
    """
    Get the leaderboard for a technical event.
    Calculates weighted scores across all rubrics and judges.
    """
    # 1. Get all submissions
    subs = supabase_admin.table("project_submissions").select("id, title, team_id").eq("event_id", event_id).execute()
    if not subs.data:
        return []

    # 2. Get all scores and rubrics for the event
    submission_ids = [s["id"] for s in subs.data]
    valid_ids = []
    for sid in submission_ids:
        try:
            uuid.UUID(sid)
            valid_ids.append(sid)
        except ValueError:
            pass

    if not valid_ids:
        scores_res = type('obj', (object,), {'data': []})()
    else:
        scores_res = supabase_admin.table("submission_scores")\
            .select("submission_id, score, rubric_id")\
            .in_("submission_id", valid_ids)\
            .execute()
    
    rubrics_res = supabase_admin.table("judging_rubrics").select("id, weight").eq("event_id", event_id).execute()
    rubric_map = {r["id"]: float(r["weight"]) for r in rubrics_res.data}

    # 3. Calculate team totals
    leaderboard = []
    for sub in subs.data:
        sub_scores = [s for s in scores_res.data if s["submission_id"] == sub["id"]]
        if not sub_scores:
            total_weighted_score = 0
        else:
            # Group by rubric to average if multiple judges? Or just sum?
            # Standard approach: Sum of (Score * Weight)
            total_weighted_score = sum(s["score"] * rubric_map.get(s["rubric_id"], 1.0) for s in sub_scores)
            
        leaderboard.append({
            "submission_id": sub["id"],
            "title": sub["title"],
            "team_id": sub["team_id"],
            "score": total_weighted_score
        })

    # Sort by score descending
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    return leaderboard

# ---------------------------------------------------------------------------
# Team Requests
# ---------------------------------------------------------------------------

@router.post("/team-requests", response_model=TeamRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_team_request(
    request: TeamRequestCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a request to join a team."""
    data = request.model_dump()
    data["user_id"] = current_user.user_id
    data["status"] = "pending"
    
    # Check if user is already a member of this team
    member_check = supabase_admin.table("team_members").select("id").eq("team_id", data["team_id"]).eq("user_id", current_user.user_id).execute()
    if member_check.data:
        raise HTTPException(status_code=400, detail="You are already a member of this team")

    # Check for existing pending request
    request_check = supabase_admin.table("team_requests").select("id").eq("team_id", data["team_id"]).eq("user_id", current_user.user_id).eq("status", "pending").execute()
    if request_check.data:
        raise HTTPException(status_code=400, detail="You already have a pending request for this team")
    
    response = supabase_admin.table("team_requests").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create team request")
    return TeamRequestResponse(**response.data[0])

@router.get("/team-requests/my", response_model=List[TeamRequestResponse])
async def list_my_requests(
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all requests sent by the current user."""
    response = supabase_admin.table("team_requests").select("*").eq("user_id", current_user.user_id).execute()
    return [TeamRequestResponse(**item) for item in response.data]

@router.get("/teams/{team_id}/requests", response_model=List[TeamRequestResponse])
async def list_team_requests(
    team_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all join requests for a team (Captain only)."""
    # Verify user is captain of this specific team
    team_res = supabase_admin.table("teams").select("captain_id").eq("id", team_id).execute()
    if not team_res.data or team_res.data[0]["captain_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized. Must be captain of this team.")

    response = supabase_admin.table("team_requests").select("*").eq("team_id", team_id).execute()
    return [TeamRequestResponse(**item) for item in response.data]

@router.put("/team-requests/{request_id}", response_model=TeamRequestResponse)
async def update_team_request(
    request_id: str,
    update: TeamRequestUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Accept or decline a team request."""
    # 1. Get request and team
    req_res = supabase_admin.table("team_requests").select("*").eq("id", request_id).execute()
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    
    request_obj = req_res.data[0]
    team_res = supabase_admin.table("teams").select("captain_id").eq("id", request_obj["team_id"]).execute()
    
    # Only captain can accept/decline; user can 'cancel' (if we added that logic)
    if team_res.data[0]["captain_id"] != current_user.user_id:
        if update.status != "cancelled" or request_obj["user_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    # 2. If accepted, add user to team_members
    if update.status == "accepted":
        # Add to team_members
        member_data = {
            "team_id": request_obj["team_id"],
            "user_id": request_obj["user_id"],
            "role": "member"
        }
        supabase_admin.table("team_members").insert(member_data).execute()

    # 3. Update request status
    response = supabase_admin.table("team_requests").update({
        "status": update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", request_id).execute()
    
    return TeamRequestResponse(**response.data[0])

# ---------------------------------------------------------------------------
# Mentorship
# ---------------------------------------------------------------------------

@router.get("/events/{event_id}/mentors", response_model=List[MentorResponse])
async def list_event_mentors(event_id: str):
    """List all mentors for an event."""
    response = supabase_admin.table("mentors").select("*").eq("event_id", event_id).execute()
    return [MentorResponse(**item) for item in response.data]

@router.get("/mentors/{mentor_id}/slots", response_model=List[MentorshipSlotResponse])
async def list_mentor_slots(mentor_id: str):
    """List available slots for a mentor."""
    response = supabase_admin.table("mentorship_slots").select("*").eq("mentor_id", mentor_id).execute()
    return [MentorshipSlotResponse(**item) for item in response.data]

@router.post("/mentorship/bookings", response_model=MentorshipBookingResponse, status_code=status.HTTP_201_CREATED)
async def book_mentorship(
    booking: MentorshipBookingCreate,
    current_user: CurrentUser = Depends(require_captain),
):
    """Book a mentorship slot for a team."""
    # Verify team captaincy
    team_res = supabase_admin.table("teams").select("captain_id").eq("id", booking.team_id).execute()
    if not team_res.data or team_res.data[0]["captain_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to book for this team")

    # 1. Verify slot is available and atomically book it
    slot_update = supabase_admin.table("mentorship_slots").update({"is_booked": True}).eq("id", booking.slot_id).eq("is_booked", False).execute()
    if not slot_update.data:
        raise HTTPException(status_code=400, detail="Slot not available or already booked")

    # 2. Create booking
    data = booking.model_dump()
    response = supabase_admin.table("mentorship_bookings").insert(data).execute()
    
    if not response.data:
        # Rollback slot
        supabase_admin.table("mentorship_slots").update({"is_booked": False}).eq("id", booking.slot_id).execute()
        raise HTTPException(status_code=400, detail="Failed to book slot")

    return MentorshipBookingResponse(**response.data[0])
