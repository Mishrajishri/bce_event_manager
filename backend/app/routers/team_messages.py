"""Team Messages Router - API endpoints for team chat and announcements."""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client, Client
from typing import List, Optional
from datetime import datetime
import os

from ..models.schemas import (
    TeamMessageCreate,
    TeamMessageResponse,
    TeamMessageUpdate
)

router = APIRouter(prefix="/team-messages", tags=["Team Messages"])


def get_supabase_client() -> Client:
    """Get Supabase client."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase configuration missing"
        )
    return create_client(supabase_url, supabase_key)


@router.post("/", response_model=TeamMessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    message: TeamMessageCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new message in a team chat."""
    data = {
        "team_id": message.team_id,
        "message": message.message,
        "attachments": message.attachments,
        "is_announcement": message.is_announcement
    }
    
    response = supabase.table("team_messages").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/team/{team_id}", response_model=List[TeamMessageResponse])
async def get_team_messages(
    team_id: str,
    limit: int = 100,
    offset: int = 0,
    supabase: Client = Depends(get_supabase_client)
):
    """Get all messages for a team chat."""
    response = supabase.table("team_messages").select(
        "*"
    ).eq("team_id", team_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    # Return in chronological order (reverse the list)
    messages = response.data
    messages.reverse()
    return messages


@router.get("/team/{team_id}/announcements", response_model=List[TeamMessageResponse])
async def get_team_announcements(
    team_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get announcement messages for a team."""
    response = supabase.table("team_messages").select(
        "*"
    ).eq("team_id", team_id).eq("is_announcement", True).order("created_at", desc=True).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


@router.get("/{message_id}", response_model=TeamMessageResponse)
async def get_message(
    message_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get a specific message by ID."""
    response = supabase.table("team_messages").select("*").eq("id", message_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    return response.data[0]


@router.put("/{message_id}", response_model=TeamMessageResponse)
async def update_message(
    message_id: str,
    message_update: TeamMessageUpdate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update a message."""
    data = {"updated_at": datetime.utcnow().isoformat()}
    
    if message_update.message is not None:
        data["message"] = message_update.message
    if message_update.is_announcement is not None:
        data["is_announcement"] = message_update.is_announcement
    
    if "message" not in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update"
        )
    
    response = supabase.table("team_messages").update(data).eq("id", message_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    return response.data[0]


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete a message."""
    response = supabase.table("team_messages").delete().eq("id", message_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )


@router.get("/team/{team_id}/latest")
async def get_latest_message(
    team_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get the latest message in a team chat."""
    response = supabase.table("team_messages").select("*").eq("team_id", team_id).order("created_at", desc=True).limit(1).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if not response.data:
        return {"message": None}
    
    return response.data[0]


@router.get("/team/{team_id}/count")
async def get_message_count(
    team_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get total message count for a team."""
    response = supabase.table("team_messages").select("id", count="exact").eq("team_id", team_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return {"count": response.count}
