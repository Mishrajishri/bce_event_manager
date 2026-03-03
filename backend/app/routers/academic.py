
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.auth import CurrentUser, require_organizer, get_current_user_optional
from app.supabase import supabase_admin
from app.models.schemas import (
    PaperSubmissionCreate, PaperSubmissionResponse,
    PaperReviewCreate, PaperReviewResponse,
    PaperSubmissionStatus
)

router = APIRouter(prefix="/events/{event_id}/academic", tags=["Academic"])

@router.post("/submissions", response_model=PaperSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_paper(
    event_id: str,
    submission: PaperSubmissionCreate,
    current_user: CurrentUser = Depends(get_current_user_optional)
):
    """Submit a paper for an event."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    data = submission.dict()
    data["event_id"] = event_id
    data["author_id"] = current_user.id
    data["status"] = PaperSubmissionStatus.SUBMITTED.value
    
    response = supabase_admin.table("paper_submissions").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to submit paper")
    return response.data[0]

@router.get("/submissions", response_model=List[PaperSubmissionResponse])
async def list_submissions(event_id: str):
    """List all paper submissions for an event."""
    response = supabase_admin.table("paper_submissions").select("*").eq("event_id", event_id).execute()
    return response.data

@router.post("/submissions/{submission_id}/reviews", response_model=PaperReviewResponse)
async def review_paper(
    submission_id: str,
    review: PaperReviewCreate,
    current_user: CurrentUser = Depends(require_organizer)
):
    """Review and score a paper submission."""
    data = review.dict()
    data["submission_id"] = submission_id
    data["reviewer_id"] = current_user.id
    
    response = supabase_admin.table("paper_reviews").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to add review")
    return response.data[0]

@router.patch("/submissions/{submission_id}/status", response_model=PaperSubmissionResponse)
async def update_submission_status(
    submission_id: str,
    status_update: dict,
    current_user: CurrentUser = Depends(require_organizer)
):
    """Update paper submission status."""
    response = supabase_admin.table("paper_submissions").update(status_update).eq("id", submission_id).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to update status")
    return response.data[0]
