"""Mentorship System Enhancement Router."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.supabase import supabase_admin, get_supabase_client
from app.models.schemas import (
    MentorResponse,
    MentorCreate,
    MentorUpdate,
    MentorshipSlotResponse,
    MentorshipSlotCreate,
    MentorshipSlotUpdate,
    MentorshipBookingResponse,
    MentorshipBookingCreate,
    MentorshipBookingUpdate,
    MentorshipFeedbackCreate,
    MentorshipFeedbackResponse,
    MentorRatingCreate,
    MentorRatingResponse,
    MentorRecommendationResponse,
    BookingStatus,
)
from app.auth import get_current_user, require_captain, require_organizer
from app.auth import CurrentUser, require_organizer

router = APIRouter(prefix="/mentorship", tags=["Mentorship"])


# ============================================
# 7.1 Mentor Management
# ============================================

@router.post("/mentors", response_model=MentorResponse, status_code=status.HTTP_201_CREATED)
async def create_mentor_profile(
    mentor: MentorCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a mentor profile for the current user."""
    # Check if user already has a mentor profile for this event
    existing = supabase_admin.table("mentors").select("*").eq("event_id", mentor.event_id).eq("user_id", mentor.user_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Mentor profile already exists for this event")
    
    # Create mentor with pending status
    data = {
        **mentor.model_dump(),
        "status": "pending",
        "average_rating": 0,
        "total_sessions": 0,
    }
    response = supabase_admin.table("mentors").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create mentor profile")
    
    return MentorResponse(**response.data[0])


@router.get("/mentors/{mentor_id}", response_model=MentorResponse)
async def get_mentor_profile(mentor_id: str):
    """Get a mentor's profile."""
    response = supabase_admin.table("mentors").select("*").eq("id", mentor_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Mentor not found")
    return MentorResponse(**response.data[0])


@router.put("/mentors/{mentor_id}", response_model=MentorResponse)
async def update_mentor_profile(
    mentor_id: str,
    mentor: MentorUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update own mentor profile."""
    # Verify ownership
    existing = supabase_admin.table("mentors").select("*").eq("id", mentor_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    if existing.data[0]["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")
    
    data = mentor.model_dump(exclude_unset=True)
    data["updated_at"] = datetime.utcnow().isoformat()
    
    response = supabase_admin.table("mentors").update(data).eq("id", mentor_id).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to update mentor profile")
    
    return MentorResponse(**response.data[0])


@router.post("/mentors/{mentor_id}/approve", response_model=MentorResponse)
async def approve_mentor(
    mentor_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Approve a mentor (organizer only)."""
    # Get mentor
    mentor = supabase_admin.table("mentors").select("*").eq("id", mentor_id).execute()
    if not mentor.data:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    # Verify organizer has access to this event
    event = supabase_admin.table("events").select("organizer_id").eq("id", mentor.data[0]["event_id"]).execute()
    if not event.data or event.data[0]["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to approve mentors for this event")
    
    # Update status to approved
    response = supabase_admin.table("mentors").update({
        "status": "approved",
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", mentor_id).execute()
    
    return MentorResponse(**response.data[0])


@router.post("/mentors/{mentor_id}/reject", response_model=MentorResponse)
async def reject_mentor(
    mentor_id: str,
    rejection_reason: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Reject a mentor (organizer only)."""
    # Get mentor
    mentor = supabase_admin.table("mentors").select("*").eq("id", mentor_id).execute()
    if not mentor.data:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    # Verify organizer has access to this event
    event = supabase_admin.table("events").select("organizer_id").eq("id", mentor.data[0]["event_id"]).execute()
    if not event.data or event.data[0]["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to reject mentors for this event")
    
    # Update status to rejected
    response = supabase_admin.table("mentors").update({
        "status": "rejected",
        "rejection_reason": rejection_reason,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", mentor_id).execute()
    
    return MentorResponse(**response.data[0])


# ============================================
# 7.2 Booking System Enhancements
# ============================================

@router.post("/slots", response_model=MentorshipSlotResponse, status_code=status.HTTP_201_CREATED)
async def create_mentor_slot(
    slot: MentorshipSlotCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a mentorship slot (mentor only)."""
    # Verify mentor ownership
    mentor = supabase_admin.table("mentors").select("*").eq("id", slot.mentor_id).execute()
    if not mentor.data:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    if mentor.data[0]["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to create slots for this mentor")
    
    data = slot.model_dump()
    response = supabase_admin.table("mentorship_slots").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create slot")
    
    return MentorshipSlotResponse(**response.data[0])


@router.put("/slots/{slot_id}", response_model=MentorshipSlotResponse)
async def update_mentor_slot(
    slot_id: str,
    slot: MentorshipSlotUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a mentorship slot (mentor only)."""
    # Get slot
    existing = supabase_admin.table("mentorship_slots").select("*").eq("id", slot_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    # Verify mentor ownership
    mentor = supabase_admin.table("mentors").select("user_id").eq("id", existing.data[0]["mentor_id"]).execute()
    if not mentor.data or mentor.data[0]["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this slot")
    
    # Can't update booked slots
    if existing.data[0]["is_booked"]:
        raise HTTPException(status_code=400, detail="Cannot update a booked slot")
    
    data = slot.model_dump(exclude_unset=True)
    response = supabase_admin.table("mentorship_slots").update(data).eq("id", slot_id).execute()
    
    return MentorshipSlotResponse(**response.data[0])


@router.delete("/slots/{slot_id}")
async def delete_mentor_slot(
    slot_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a mentorship slot (mentor only)."""
    # Get slot
    existing = supabase_admin.table("mentorship_slots").select("*").eq("id", slot_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    # Verify mentor ownership
    mentor = supabase_admin.table("mentors").select("user_id").eq("id", existing.data[0]["mentor_id"]).execute()
    if not mentor.data or mentor.data[0]["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this slot")
    
    # Can't delete booked slots
    if existing.data[0]["is_booked"]:
        raise HTTPException(status_code=400, detail="Cannot delete a booked slot")
    
    supabase_admin.table("mentorship_slots").delete().eq("id", slot_id).execute()
    
    return {"message": "Slot deleted successfully"}


@router.get("/bookings/my", response_model=List[MentorshipBookingResponse])
async def get_my_bookings(current_user: CurrentUser = Depends(get_current_user)):
    """Get all bookings for the current user (as mentor or team captain)."""
    
    # Check if user is a mentor
    mentor = supabase_admin.table("mentors").select("id").eq("user_id", current_user.user_id).execute()
    
    bookings = []
    
    if mentor.data:
        # Get bookings for mentor's slots
        mentor_id = mentor.data[0]["id"]
        slots = supabase_admin.table("mentorship_slots").select("id").eq("mentor_id", mentor_id).execute()
        slot_ids = [s["id"] for s in slots.data]
        
        if slot_ids:
            mentor_bookings = supabase_admin.table("mentorship_bookings").select(
                "*, mentorship_slots(start_time, end_time, mentor_id)"
            ).in_("slot_id", slot_ids).execute()
            bookings.extend(mentor_bookings.data)
    
    # Check if user is a team captain
    teams = supabase_admin.table("teams").select("id").eq("captain_id", current_user.user_id).execute()
    team_ids = [t["id"] for t in teams.data]
    
    if team_ids:
        captain_bookings = supabase_admin.table("mentorship_bookings").select(
            "*, mentorship_slots(start_time, end_time, mentor_id)"
        ).in_("team_id", team_ids).execute()
        
        # Merge bookings, avoiding duplicates
        existing_ids = {b["id"] for b in bookings}
        for b in captain_bookings.data:
            if b["id"] not in existing_ids:
                bookings.append(b)
    
    # Format response
    formatted = []
    for b in bookings:
        slot = b.get("mentorship_slots", {})
        formatted.append({
            **b,
            "start_time": slot.get("start_time") if slot else None,
            "end_time": slot.get("end_time") if slot else None,
        })
    
    return [MentorshipBookingResponse(**b) for b in formatted]


@router.put("/bookings/{booking_id}", response_model=MentorshipBookingResponse)
async def update_booking(
    booking_id: str,
    update: MentorshipBookingUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a booking (cancel, complete, add notes)."""
    # Get booking
    booking = supabase_admin.table("mentorship_bookings").select("*").eq("id", booking_id).execute()
    if not booking.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking_data = booking.data[0]
    
    # Check authorization
    slots = supabase_admin.table("mentorship_slots").select("mentor_id").eq("id", booking_data["slot_id"]).execute()
    if not slots.data:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    mentor = supabase_admin.table("mentors").select("user_id").eq("id", slots.data[0]["mentor_id"]).execute()
    teams = supabase_admin.table("teams").select("captain_id").eq("id", booking_data["team_id"]).execute()
    
    is_mentor = mentor.data and mentor.data[0]["user_id"] == current_user.user_id
    is_captain = teams.data and teams.data[0]["captain_id"] == current_user.user_id
    
    if not is_mentor and not is_captain:
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")
    
    # Only mentor can add meeting link and notes
    data = {}
    if update.meeting_link is not None and is_mentor:
        data["meeting_link"] = update.meeting_link
    if update.mentor_notes is not None and is_mentor:
        data["mentor_notes"] = update.mentor_notes
    
    # Both can change status (for cancellation/completion)
    if update.status is not None:
        old_status = booking_data.get("status", "confirmed")
        
        # Validate status transitions
        if update.status == BookingStatus.CANCELLED:
            if old_status not in ["confirmed"]:
                raise HTTPException(status_code=400, detail="Cannot cancel a booking that is not confirmed")
            
            # Release the slot
            supabase_admin.table("mentorship_slots").update({"is_booked": False}).eq("id", booking_data["slot_id"]).execute()
        
        elif update.status == BookingStatus.COMPLETED:
            if old_status not in ["confirmed"]:
                raise HTTPException(status_code=400, detail="Cannot complete a booking that is not confirmed")
            
            # Update mentor stats
            if slots.data:
                supabase_admin.rpc("update_mentor_stats", {"p_mentor_id": slots.data[0]["mentor_id"]}).execute()
        
        data["status"] = update.status.value
    
    data["updated_at"] = datetime.utcnow().isoformat()
    
    response = supabase_admin.table("mentorship_bookings").update(data).eq("id", booking_id).execute()
    
    return MentorshipBookingResponse(**response.data[0])


# ============================================
# 7.3 Feedback & Rating System
# ============================================

@router.post("/feedback", response_model=MentorshipFeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    feedback: MentorshipFeedbackCreate,
    booking_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Submit feedback for a completed mentorship session."""
    # Get booking
    booking = supabase_admin.table("mentorship_bookings").select("*").eq("id", booking_id).execute()
    if not booking.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking_data = booking.data[0]
    
    # Verify booking is completed
    if booking_data.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Can only provide feedback for completed sessions")
    
    # Verify user is team captain
    team = supabase_admin.table("teams").select("captain_id").eq("id", booking_data["team_id"]).execute()
    if not team.data or team.data[0]["captain_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only team captain can provide feedback")
    
    # Check if feedback already exists
    existing = supabase_admin.table("mentorship_feedback").select("id").eq("booking_id", booking_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Feedback already submitted for this booking")
    
    # Create feedback
    data = {
        "booking_id": booking_id,
        "rating": feedback.rating,
        "feedback_text": feedback.feedback_text,
        "would_recommend": feedback.would_recommend,
        "areas_improved": feedback.areas_improved,
    }
    response = supabase_admin.table("mentorship_feedback").insert(data).execute()
    
    # Also create rating for the mentor
    slot = supabase_admin.table("mentorship_slots").select("mentor_id").eq("id", booking_data["slot_id"]).execute()
    if slot.data:
        supabase_admin.table("mentor_ratings").insert({
            "mentor_id": slot.data[0]["mentor_id"],
            "booking_id": booking_id,
            "rating": feedback.rating,
        }).execute()
        
        # Update mentor stats
        supabase_admin.rpc("update_mentor_stats", {"p_mentor_id": slot.data[0]["mentor_id"]}).execute()
    
    return MentorshipFeedbackResponse(**response.data[0])


@router.get("/mentors/{mentor_id}/feedback", response_model=List[MentorshipFeedbackResponse])
async def get_mentor_feedback(mentor_id: str):
    """Get all feedback for a mentor."""
    # Get mentor's slots
    slots = supabase_admin.table("mentorship_slots").select("id").eq("mentor_id", mentor_id).execute()
    slot_ids = [s["id"] for s in slots.data]
    
    if not slot_ids:
        return []
    
    # Get bookings for those slots
    bookings = supabase_admin.table("mentorship_bookings").select("id").in_("slot_id", slot_ids).execute()
    booking_ids = [b["id"] for b in bookings.data]
    
    if not booking_ids:
        return []
    
    # Get feedback for those bookings
    feedback = supabase_admin.table("mentorship_feedback").select("*").in_("booking_id", booking_ids).execute()
    
    return [MentorshipFeedbackResponse(**f) for f in feedback.data]


@router.get("/mentors/{mentor_id}/ratings", response_model=MentorRecommendationResponse)
async def get_mentor_ratings(mentor_id: str):
    """Get mentor's rating summary and recommendations."""
    # Get recommendation stats
    rec = supabase_admin.table("mentor_recommendations").select("*").eq("mentor_id", mentor_id).execute()
    
    if rec.data:
        return MentorRecommendationResponse(**rec.data[0])
    
    # Return default if no data
    return MentorRecommendationResponse(
        mentor_id=mentor_id,
        total_recommendations=0,
        total_sessions=0,
        recommendation_rate=0,
    )


# ============================================
# Analytics
# ============================================

@router.get("/events/{event_id}/mentor-analytics")
async def get_event_mentor_analytics(
    event_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Get mentor analytics for an event (organizer only)."""
    # Verify organizer has access
    event = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    if not event.data or event.data[0]["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view analytics for this event")
    
    # Get all mentors for event
    mentors = supabase_admin.table("mentors").select("*").eq("event_id", event_id).execute()
    
    analytics = []
    for mentor in mentors.data:
        # Get mentor's stats
        slots = supabase_admin.table("mentorship_slots").select("id").eq("mentor_id", mentor["id"]).execute()
        slot_ids = [s["id"] for s in slots.data]
        
        bookings = []
        if slot_ids:
            bookings = supabase_admin.table("mentorship_bookings").select("*").in_("slot_id", slot_ids).execute()
        
        total_slots = len(slot_ids)
        booked_slots = len([b for b in bookings.data if b.get("status") != "cancelled"])
        completed_sessions = len([b for b in bookings.data if b.get("status") == "completed"])
        
        analytics.append({
            "mentor_id": mentor["id"],
            "status": mentor["status"],
            "average_rating": mentor.get("average_rating", 0),
            "total_sessions": mentor.get("total_sessions", 0),
            "total_slots": total_slots,
            "booked_slots": booked_slots,
            "completed_sessions": completed_sessions,
            "utilization_rate": (booked_slots / total_slots * 100) if total_slots > 0 else 0,
        })
    
    return analytics


@router.get("/my-stats")
async def get_my_mentor_stats(current_user: CurrentUser = Depends(get_current_user)):
    """Get current user's mentor stats (if they're a mentor)."""
    mentor = supabase_admin.table("mentors").select("*").eq("user_id", current_user.user_id).execute()
    
    if not mentor.data:
        raise HTTPException(status_code=404, detail="You are not a mentor")
    
    mentor_data = mentor.data[0]
    
    # Get slots
    slots = supabase_admin.table("mentorship_slots").select("id").eq("mentor_id", mentor_data["id"]).execute()
    slot_ids = [s["id"] for s in slots.data]
    
    # Get bookings
    bookings = []
    if slot_ids:
        bookings = supabase_admin.table("mentorship_bookings").select("*").in_("slot_id", slot_ids).execute()
    
    total_slots = len(slot_ids)
    booked_slots = len([b for b in bookings.data if b.get("status") != "cancelled"])
    completed = len([b for b in bookings.data if b.get("status") == "completed"])
    cancelled = len([b for b in bookings.data if b.get("status") == "cancelled"])
    
    return {
        "mentor_id": mentor_data["id"],
        "status": mentor_data["status"],
        "average_rating": mentor_data.get("average_rating", 0),
        "total_sessions": mentor_data.get("total_sessions", 0),
        "total_slots": total_slots,
        "booked_slots": booked_slots,
        "completed_sessions": completed,
        "cancelled_sessions": cancelled,
        "utilization_rate": (booked_slots / total_slots * 100) if total_slots > 0 else 0,
    }
