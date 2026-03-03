"""Matches API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

import random
from app.models import (
    MatchCreate,
    MatchUpdate,
    MatchResponse,
    BracketGenerateRequest,
    BracketType,
    MatchStatus,
    MatchCommentaryCreate,
    MatchCommentaryResponse,
)
from app.auth import CurrentUser, require_organizer, get_current_user_optional
from app.supabase import supabase_admin
from app.socket_manager import broadcast_score_update, broadcast_commentary
from app.utils.bracket_manager import BracketManager


router = APIRouter(prefix="/events/{event_id}/matches", tags=["Matches"])


@router.get("/", response_model=List[MatchResponse])
async def list_event_matches(
    event_id: str,
    current_user: CurrentUser = Depends(get_current_user_optional),
):
    """
    List all matches for an event.
    
    Args:
        event_id: Event ID
        current_user: Optional authenticated user
        
    Returns:
        List[MatchResponse]: List of matches
        
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
    
    response = supabase_admin.table("matches").select("*").eq("event_id", event_id).order("match_date").execute()
    
    return [MatchResponse(**item) for item in response.data]


@router.post("/", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
async def create_match(
    event_id: str,
    match_data: MatchCreate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Create a new match.
    
    Args:
        event_id: Event ID
        match_data: Match creation data
        current_user: Current authenticated organizer
        
    Returns:
        MatchResponse: Created match
        
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
    
    if current_user.role not in ("super_admin", "admin") and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create matches for this event"
        )
    
    # Create match
    data = match_data.model_dump()
    data["event_id"] = event_id
    data["status"] = MatchStatus.SCHEDULED.value
    data["score_team1"] = 0
    data["score_team2"] = 0
    
    response = supabase_admin.table("matches").insert(data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create match"
        )
    
    return MatchResponse(**response.data[0])


@router.put("/{match_id}", response_model=MatchResponse)
async def update_match(
    event_id: str,
    match_id: str,
    match_data: MatchUpdate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Update a match (scores, status).
    
    Args:
        event_id: Event ID
        match_id: Match ID
        match_data: Match update data
        current_user: Current authenticated organizer
        
    Returns:
        MatchResponse: Updated match
        
    Raises:
        HTTPException: If match not found or access denied
    """
    # Verify match exists
    match_response = supabase_admin.table("matches").select("*").eq("id", match_id).eq("event_id", event_id).execute()
    
    if not match_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    match = match_response.data[0]
    
    # Verify event permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if current_user.role not in ("super_admin", "admin") and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update matches for this event"
        )
    
    # Update match
    update_data = {k: v for k, v in match_data.model_dump().items() if v is not None}
    
    # If match is completed, determine winner
    if update_data.get("status") == MatchStatus.COMPLETED.value:
        if update_data.get("score_team1", match["score_team1"]) > update_data.get("score_team2", match["score_team2"]):
            update_data["winner_id"] = match["team1_id"]
        elif update_data.get("score_team2", match["score_team2"]) > update_data.get("score_team1", match["score_team1"]):
            update_data["winner_id"] = match["team2_id"]
    
    response = supabase_admin.table("matches").update(update_data).eq("id", match_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update match"
        )
    
    updated_match = response.data[0]
    
    # Broadcast real-time update
    await broadcast_score_update(match_id, updated_match)
    
    return MatchResponse(**updated_match)


@router.post("/brackets/generate", status_code=status.HTTP_201_CREATED)
async def generate_brackets(
    event_id: str,
    bracket_request: BracketGenerateRequest,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Generate tournament brackets for an event.
    
    Args:
        event_id: Event ID
        bracket_request: Bracket generation request
        current_user: Current authenticated organizer
        
    Returns:
        dict: Success message with generated matches
        
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
    
    if current_user.role not in ("super_admin", "admin") and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to generate brackets for this event"
        )
    
    # Get confirmed teams
    teams_response = supabase_admin.table("teams").select("*").eq("event_id", event_id).eq("status", "confirmed").execute()
    teams = teams_response.data
    
    if len(teams) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Need at least 2 confirmed teams to generate brackets"
        )
    
    # Clear existing matches for this event
    supabase_admin.table("matches").delete().eq("event_id", event_id).execute()
    
    matches = []
    
    if bracket_request.bracket_type == BracketType.KNOCKOUT:
        matches = BracketManager.generate_single_elimination(event_id, teams, event["start_date"])
    
    elif bracket_request.bracket_type == BracketType.ROUND_ROBIN:
        matches = BracketManager.generate_round_robin(event_id, teams, event["start_date"])
    
    # Insert matches
    inserted_matches = []
    for match in matches:
        response = supabase_admin.table("matches").insert(match).execute()
        if response.data:
            inserted_matches.append(response.data[0])
    
    return {
        "message": f"Successfully generated {len(inserted_matches)} matches",
        "matches": inserted_matches,
        "bracket_type": bracket_request.bracket_type.value,
    }


@router.get("/brackets", response_model=dict)
async def get_bracket_visualization(
    event_id: str,
    current_user: CurrentUser = Depends(get_current_user_optional),
):
    """
    Get tournament bracket visualization data.
    
    Args:
        event_id: Event ID
        current_user: Optional authenticated user
        
    Returns:
        dict: Bracket visualization data
        
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
    
    # Get all matches with team info
    matches_response = supabase_admin.table("matches").select("*").eq("event_id", event_id).execute()
    
    # Get teams
    teams_response = supabase_admin.table("teams").select("*").eq("event_id", event_id).execute()
    teams = {t["id"]: t for t in teams_response.data}
    
    # Build bracket structure
    brackets = []
    for match in matches_response.data:
        team1 = teams.get(match["team1_id"], {})
        team2 = teams.get(match["team2_id"], {})
        
        brackets.append({
            "id": match["id"],
            "team1": {"id": team1.get("id"), "name": team1.get("name")},
            "team2": {"id": team2.get("id"), "name": team2.get("name")},
            "score_team1": match["score_team1"],
            "score_team2": match["score_team2"],
            "status": match["status"],
            "winner_id": match["winner_id"],
        })
    
    return {
        "event_id": event_id,
        "matches": brackets,
        "teams": [{"id": t["id"], "name": t["name"]} for t in teams.values()],
    }

# ---------------------------------------------------------------------------
# Match Commentary
# ---------------------------------------------------------------------------

@router.post("/{match_id}/commentary", response_model=MatchCommentaryResponse, status_code=status.HTTP_201_CREATED)
async def add_commentary(
    event_id: str,
    match_id: str,
    commentary_data: MatchCommentaryCreate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Add a commentary entry to a match and broadcast it."""
    data = commentary_data.model_dump()
    data["match_id"] = match_id
    
    response = supabase_admin.table("match_commentary").insert(data).execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to add commentary")
    
    commentary = response.data[0]
    
    # Broadcast to listeners
    await broadcast_commentary(match_id, commentary)
    
    return MatchCommentaryResponse(**commentary)

@router.get("/{match_id}/commentary", response_model=List[MatchCommentaryResponse])
async def list_commentary(event_id: str, match_id: str):
    """List all commentary for a match."""
    response = supabase_admin.table("match_commentary").select("*").eq("match_id", match_id).order("created_at", desc=True).execute()
    return [MatchCommentaryResponse(**item) for item in response.data]
