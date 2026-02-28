"""Teams API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.models import (
    TeamUpdate,
    TeamResponse,
    TeamMemberCreate,
    TeamMemberResponse,
)
from app.auth import CurrentUser, get_current_user_optional, require_any_user
from app.supabase import supabase_admin


router = APIRouter(prefix="/teams", tags=["Teams"])


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    Get team by ID.
    
    Args:
        team_id: Team ID
        current_user: Optional authenticated user
        
    Returns:
        TeamResponse: Team details
        
    Raises:
        HTTPException: If team not found
    """
    response = supabase_admin.table("teams").select("*").eq("id", team_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    return TeamResponse(**response.data[0])


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    team_data: TeamUpdate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """
    Update a team.
    
    Args:
        team_id: Team ID
        team_data: Team update data
        current_user: Current authenticated user
        
    Returns:
        TeamResponse: Updated team
        
    Raises:
        HTTPException: If team not found or access denied
    """
    # Check if team exists
    team_response = supabase_admin.table("teams").select("*").eq("id", team_id).execute()
    
    if not team_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    team = team_response.data[0]
    
    # Only captain, event organizer, or admin can update
    is_captain = team.get("captain_id") == current_user.user_id
    
    # Check if user is event organizer
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", team["event_id"]).execute()
    is_event_organizer = event_response.data and event_response.data[0]["organizer_id"] == current_user.user_id
    
    if not is_captain and not is_event_organizer and current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this team"
        )
    
    # Update team
    update_data = {k: v for k, v in team_data.model_dump().items() if v is not None}
    
    response = supabase_admin.table("teams").update(update_data).eq("id", team_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update team"
        )
    
    return TeamResponse(**response.data[0])


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: str,
    member_data: TeamMemberCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """
    Add a member to a team.
    
    Args:
        team_id: Team ID
        member_data: Team member data
        current_user: Current authenticated user
        
    Returns:
        TeamMemberResponse: Created team member
        
    Raises:
        HTTPException: If team not found or access denied
    """
    # Verify team exists
    team_response = supabase_admin.table("teams").select("*").eq("id", team_id).execute()
    
    if not team_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    team = team_response.data[0]
    
    # Only captain or event organizer can add members
    is_captain = team.get("captain_id") == current_user.user_id
    
    # Check if user is event organizer
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", team["event_id"]).execute()
    is_event_organizer = event_response.data and event_response.data[0]["organizer_id"] == current_user.user_id
    
    if not is_captain and not is_event_organizer and current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add members to this team"
        )
    
    # Check if user already in team
    existing = supabase_admin.table("team_members").select("*").eq("team_id", team_id).eq("user_id", member_data.user_id).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this team"
        )
    
    # Add member
    data = member_data.model_dump()
    data["team_id"] = team_id
    
    response = supabase_admin.table("team_members").insert(data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add team member"
        )
    
    return TeamMemberResponse(**response.data[0])


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: str,
    user_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """
    Remove a member from a team.
    
    Args:
        team_id: Team ID
        user_id: User ID to remove
        current_user: Current authenticated user
        
    Raises:
        HTTPException: If team not found or access denied
    """
    # Verify team exists
    team_response = supabase_admin.table("teams").select("*").eq("id", team_id).execute()
    
    if not team_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    team = team_response.data[0]
    
    # Only captain, user themselves, or event organizer can remove members
    is_captain = team.get("captain_id") == current_user.user_id
    is_self = user_id == current_user.user_id
    
    # Check if user is event organizer
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", team["event_id"]).execute()
    is_event_organizer = event_response.data and event_response.data[0]["organizer_id"] == current_user.user_id
    
    if not is_captain and not is_self and not is_event_organizer and current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to remove members from this team"
        )
    
    # Remove member
    supabase_admin.table("team_members").delete().eq("team_id", team_id).eq("user_id", user_id).execute()


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def list_team_members(
    team_id: str,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    List all members of a team.
    
    Args:
        team_id: Team ID
        current_user: Optional authenticated user
        
    Returns:
        List[TeamMemberResponse]: List of team members
        
    Raises:
        HTTPException: If team not found
    """
    # Verify team exists
    team_response = supabase_admin.table("teams").select("id").eq("id", team_id).execute()
    
    if not team_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    response = supabase_admin.table("team_members").select("*").eq("team_id", team_id).execute()
    
    return [TeamMemberResponse(**item) for item in response.data]
