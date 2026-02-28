"""Feedback API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models import FeedbackCreate, FeedbackResponse
from app.auth import CurrentUser, get_current_user, get_current_user_optional
from app.supabase import supabase_admin
from typing import Optional

router = APIRouter(prefix="/events/{event_id}/feedback", tags=["Feedback"])


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    event_id: str,
    data: FeedbackCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Submit feedback for a completed event (one per user per event)."""
    # Check event exists and is completed
    event_resp = supabase_admin.table("events").select("id, status").eq("id", event_id).execute()
    if not event_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if event_resp.data[0]["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback can only be submitted for completed events",
        )

    # Check duplicate
    existing = (
        supabase_admin.table("feedback")
        .select("id")
        .eq("event_id", event_id)
        .eq("user_id", current_user.user_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted feedback for this event",
        )

    response = None
    try:
        response = supabase_admin.table("feedback").insert({
            "event_id": event_id,
            "user_id": current_user.user_id,
            "rating": data.rating,
            "comment": data.comment,
        }).execute()
    except Exception as e:
        # Catch Postgres unique constraint violation (23505) for concurrent requests
        error_str = str(e)
        if "23505" in error_str or "duplicate" in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already submitted feedback for this event",
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to submit feedback: {error_str}")

    if not response or not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to submit feedback")

    return FeedbackResponse(**response.data[0])


@router.get("/", response_model=List[FeedbackResponse])
async def list_feedback(
    event_id: str,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """List all feedback for an event."""
    response = (
        supabase_admin.table("feedback")
        .select("*")
        .eq("event_id", event_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [FeedbackResponse(**item) for item in response.data]


@router.get("/summary")
async def feedback_summary(
    event_id: str,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """Get average rating and total feedback count for an event."""
    response = (
        supabase_admin.table("feedback")
        .select("rating")
        .eq("event_id", event_id)
        .execute()
    )

    ratings = [f["rating"] for f in response.data]
    total = len(ratings)
    average = sum(ratings) / total if total > 0 else 0

    return {"event_id": event_id, "average_rating": round(average, 1), "total_feedback": total}
