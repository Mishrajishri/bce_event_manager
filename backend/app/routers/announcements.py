"""Announcements API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.models import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
)
from app.auth import CurrentUser, get_current_user, get_current_user_optional, require_organizer
from app.supabase import supabase_admin


router = APIRouter(prefix="/events/{event_id}/announcements", tags=["Announcements"])


@router.get("/", response_model=List[AnnouncementResponse])
async def list_announcements(
    event_id: str,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    List all announcements for an event.
    
    Args:
        event_id: Event ID
        current_user: Optional authenticated user
        
    Returns:
        List[AnnouncementResponse]: List of announcements
    """
    # Verify event exists
    event_response = supabase_admin.table("events").select("id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    response = supabase_admin.table("announcements").select("*").eq("event_id", event_id).order("created_at", desc=True).execute()
    
    return [AnnouncementResponse(**item) for item in response.data]


@router.post("/", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    event_id: str,
    announcement_data: AnnouncementCreate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Create a new announcement.
    
    Args:
        event_id: Event ID
        announcement_data: Announcement creation data
        current_user: Current authenticated organizer
        
    Returns:
        AnnouncementResponse: Created announcement
        
    Raises:
        HTTPException: If event not found or access denied
    """
    # Verify event exists and user has permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if current_user.role != "admin" and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create announcements for this event"
        )
    
    # Create announcement
    data = announcement_data.model_dump()
    data["event_id"] = event_id
    data["created_by_id"] = current_user.user_id
    
    response = supabase_admin.table("announcements").insert(data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create announcement"
        )
    
    return AnnouncementResponse(**response.data[0])


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    event_id: str,
    announcement_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Delete an announcement.
    
    Args:
        event_id: Event ID
        announcement_id: Announcement ID
        current_user: Current authenticated organizer
        
    Raises:
        HTTPException: If announcement not found or access denied
    """
    # Verify announcement exists
    announcement_response = supabase_admin.table("announcements").select("*").eq("id", announcement_id).eq("event_id", event_id).execute()
    
    if not announcement_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    
    announcement = announcement_response.data[0]
    
    # Verify event permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    # Allow deletion by event organizer or announcement creator
    if current_user.role != "admin" and event["organizer_id"] != current_user.user_id and announcement["created_by_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this announcement"
        )
    
    supabase_admin.table("announcements").delete().eq("id", announcement_id).execute()
