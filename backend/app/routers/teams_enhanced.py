"""Teams Enhanced Router - Extended team management with skill requirements."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional

from ..models.schemas import TeamResponse
from ..auth import CurrentUser, get_current_user_optional, require_any_user
from ..supabase import supabase_admin

router = APIRouter(prefix="/teams-enhanced", tags=["Teams Enhanced"])


@router.get("/event/{event_id}", response_model=List[TeamResponse])
async def list_event_teams(
    event_id: str,
    with_skills: bool = False,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """List all teams for an event with optional skill requirements."""
    # Verify event exists
    event_response = supabase_admin.table("events").select("id").eq("id", event_id).execute()
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Get teams
    teams_response = supabase_admin.table("teams").select("*").eq("event_id", event_id).range(offset, offset + limit - 1).execute()
    
    teams = teams_response.data
    
    # Optionally include skill requirements
    if with_skills and teams:
        team_ids = [t["id"] for t in teams]
        
        # Get skill requirements for all teams
        requirements_response = supabase_admin.table("team_requirements").select("*").in_("team_id", team_ids).execute()
        
        # Group requirements by team_id
        requirements_by_team = {}
        for req in requirements_response.data:
            team_id = req.get("team_id")
            if team_id not in requirements_by_team:
                requirements_by_team[team_id] = []
            requirements_by_team[team_id].append(req)
        
        # Attach requirements to teams
        for team in teams:
            team["skill_requirements"] = requirements_by_team.get(team["id"], [])
    
    return [TeamResponse(**team) for team in teams]


@router.get("/search")
async def search_teams(
    skill: Optional[str] = None,
    event_type: Optional[str] = None,
    max_members: Optional[int] = None,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """Search for teams based on skill requirements."""
    # Start with all public teams
    query = supabase_admin.table("teams").select("*, events(event_type, name)").eq("is_public", True)
    
    if max_members:
        # This would require a join to count current members
        # For simplicity, we'll handle this in post-processing
        pass
    
    query = query.range(offset, offset + limit - 1)
    response = query.execute()
    
    teams = response.data
    
    # Filter by skill if specified
    if skill and teams:
        team_ids = [t["id"] for t in teams]
        
        # Find teams with matching skill requirements
        skills_response = supabase_admin.table("team_requirements").select("team_id").ilike("skill_name", f"%{skill}%").in_("team_id", team_ids).execute()
        
        matching_team_ids = set(r["team_id"] for r in skills_response.data)
        teams = [t for t in teams if t["id"] in matching_team_ids]
    
    # Filter by event type if specified
    if event_type and teams:
        teams = [t for t in teams if t.get("events", {}).get("event_type") == event_type]
    
    return {"teams": teams, "total": len(teams)}


@router.get("/{team_id}/skills")
async def get_team_skills(
    team_id: str,
):
    """Get skill requirements for a team."""
    # Verify team exists
    team_response = supabase_admin.table("teams").select("id").eq("id", team_id).execute()
    if not team_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Get skill requirements
    requirements_response = supabase_admin.table("team_requirements").select("*").eq("team_id", team_id).execute()
    
    # Get team skills
    skills_response = supabase_admin.table("team_skills").select("*").eq("team_id", team_id).execute()
    
    return {
        "requirements": requirements_response.data,
        "skills": skills_response.data
    }


@router.post("/{team_id}/requirements")
async def add_team_requirement(
    team_id: str,
    skill_name: str,
    priority: int = Query(1, ge=1, le=5),
    is_required: bool = True,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Add a skill requirement to a team."""
    # Verify team exists and user has permission
    team_response = supabase_admin.table("teams").select("*").eq("id", team_id).execute()
    if not team_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    team = team_response.data[0]
    
    # Check permissions (captain or organizer)
    is_captain = team.get("captain_id") == current_user.user_id
    
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", team["event_id"]).execute()
    is_event_organizer = event_response.data and event_response.data[0]["organizer_id"] == current_user.user_id
    
    if not is_captain and not is_event_organizer and current_user.role not in ("super_admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add requirements to this team"
        )
    
    # Add requirement
    data = {
        "team_id": team_id,
        "skill_name": skill_name,
        "priority": priority,
        "is_required": is_required
    }
    
    response = supabase_admin.table("team_requirements").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.delete("/{team_id}/requirements/{requirement_id}")
async def remove_team_requirement(
    team_id: str,
    requirement_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Remove a skill requirement from a team."""
    # Verify team exists and user has permission
    team_response = supabase_admin.table("teams").select("*").eq("id", team_id).execute()
    if not team_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    team = team_response.data[0]
    
    # Check permissions
    is_captain = team.get("captain_id") == current_user.user_id
    
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", team["event_id"]).execute()
    is_event_organizer = event_response.data and event_response.data[0]["organizer_id"] == current_user.user_id
    
    if not is_captain and not is_event_organizer and current_user.role not in ("super_admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to remove requirements from this team"
        )
    
    # Delete requirement
    response = supabase_admin.table("team_requirements").delete().eq("id", requirement_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return {"message": "Requirement removed successfully"}


@router.get("/skills/recommended-teammates/{team_id}")
async def get_recommended_teammates(
    team_id: str,
    limit: int = Query(10, ge=1, le=20),
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get recommended teammates based on team skill requirements."""
    # Verify team exists
    team_response = supabase_admin.table("teams").select("*").eq("id", team_id).execute()
    if not team_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    team = team_response.data[0]
    
    # Get team skill requirements
    requirements_response = supabase_admin.table("team_requirements").select("skill_name").eq("team_id", team_id).execute()
    
    if not requirements_response.data:
        return {"recommendations": [], "message": "No skill requirements defined"}
    
    skill_names = [r["skill_name"] for r in requirements_response.data]
    
    # Find users with matching skills who are not already in the team
    # First get current team member IDs
    members_response = supabase_admin.table("team_members").select("user_id").eq("team_id", team_id).execute()
    member_ids = [m["user_id"] for m in members_response.data]
    member_ids.append(team.get("captain_id"))
    
    # Find users with matching skills
    users_response = supabase_admin.table("user_skills").select("user_id, skill_name, proficiency_level").in_("skill_name", skill_names).execute()
    
    # Group by user_id and calculate match score
    user_matches = {}
    for skill in users_response.data:
        user_id = skill["user_id"]
        if user_id not in member_ids:  # Exclude existing members
            if user_id not in user_matches:
                user_matches[user_id] = {"user_id": user_id, "matching_skills": [], "score": 0}
            
            user_matches[user_id]["matching_skills"].append({
                "skill_name": skill["skill_name"],
                "proficiency_level": skill.get("proficiency_level", 1)
            })
            user_matches[user_id]["score"] += skill.get("proficiency_level", 1)
    
    # Sort by score and return top recommendations
    recommendations = sorted(user_matches.values(), key=lambda x: x["score"], reverse=True)[:limit]
    
    return {"recommendations": recommendations}
