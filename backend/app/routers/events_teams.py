"""Event-specific teams API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models import TeamCreate, TeamResponse, TeamStatus
from app.auth import CurrentUser, require_any_user, get_current_user_optional
from app.supabase import supabase_admin


router = APIRouter(prefix="/events/{event_id}/teams", tags=["Event Teams"])


@router.get("/", response_model=List[TeamResponse])
async def list_event_teams(
    event_id: str,
    status_filter: TeamStatus = None,
    current_user: CurrentUser = Depends(get_current_user_optional),
):
    """
    List all teams for an event.
    
    Args:
        event_id: Event ID
        status_filter: Optional status filter
        current_user: Optional authenticated user
        
    Returns:
        List[TeamResponse]: List of teams
        
    Raises:
        HTTPException: If event not found
    """
    # Verify event exists
    event_response = supabase_admin.table("events").select("id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    query = supabase_admin.table("teams").select("*").eq("event_id", event_id)
    
    if status_filter:
        query = query.eq("status", status_filter.value)
    
    response = query.order("created_at", desc=True).execute()
    
    return [TeamResponse(**item) for item in response.data]


@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    event_id: str,
    team_data: TeamCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """
    Create a new team for an event.
    
    Args:
        event_id: Event ID
        team_data: Team creation data
        current_user: Current authenticated user
        
    Returns:
        TeamResponse: Created team
        
    Raises:
        HTTPException: If event not found or access denied
    """
    # Verify event exists and is open for registration
    event_response = supabase_admin.table("events").select("*").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if event["status"] not in ["draft", "published"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create teams for this event at this time"
        )
    
    # Check if user is already in a team for this event
    existing_team = supabase_admin.table("team_members").select("team_id").eq("user_id", current_user.user_id).execute()
    
    if existing_team.data:
        # Check if team belongs to this event
        team_ids = [t["team_id"] for t in existing_team.data]
        if team_ids:
            team_response = supabase_admin.table("teams").select("event_id").in_("id", team_ids).execute()
            for t in team_response.data:
                if t["event_id"] == event_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="You are already in a team for this event"
                    )
    
    # Create team
    data = team_data.model_dump()
    data["event_id"] = event_id
    data["captain_id"] = current_user.user_id
    data["status"] = TeamStatus.REGISTERED.value
    
    response = supabase_admin.table("teams").insert(data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create team"
        )
    
    team_id = response.data[0]["id"]
    
    # Add captain as first member
    supabase_admin.table("team_members").insert({
        "team_id": team_id,
        "user_id": current_user.user_id,
        "role": "captain",
    }).execute()
    
    return TeamResponse(**response.data[0])
