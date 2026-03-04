"""Skills Router - API endpoints for team skill matching and user skills."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timedelta

from ..models.schemas import (
    TeamSkillCreate,
    TeamSkillResponse,
    TeamSkillUpdate,
    TeamRequirementCreate,
    TeamRequirementResponse,
    TeamRequirementUpdate,
    UserSkillCreate,
    UserSkillResponse,
    UserSkillUpdate,
    TeamInviteCreate,
    TeamInviteResponse,
    TeamInviteUpdate,
    InviteStatus,
)
from ..auth import CurrentUser, require_any_user
from ..supabase import supabase_admin

router = APIRouter(prefix="/skills", tags=["Skills & Team Matching"])


def _check_team_membership(team_id: str, user_id: str) -> bool:
    """Check if user is a member of the team."""
    result = supabase_admin.table("team_members").select("id").eq("team_id", team_id).eq("user_id", user_id).execute()
    return bool(result.data)


def _check_team_leadership(team_id: str, user_id: str) -> bool:
    """Check if user is a leader of the team."""
    result = supabase_admin.table("team_members").select("id").eq("team_id", team_id).eq("user_id", user_id).eq("role", "leader").execute()
    return bool(result.data)


def _validate_skill_name(skill_name: str) -> str:
    """Validate and sanitize skill name."""
    # Only allow alphanumeric, spaces, and common special chars
    import re
    sanitized = re.sub(r'[^a-zA-Z0-9\s\-_]', '', skill_name.strip())
    if not sanitized or len(sanitized) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid skill name"
        )
    return sanitized


# ========================
# Team Skills Endpoints
# ========================

@router.post("/team-skills", response_model=TeamSkillResponse, status_code=status.HTTP_201_CREATED)
async def create_team_skill(
    skill: TeamSkillCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Add a skill to a team."""
    # Check team membership
    if not _check_team_membership(skill.team_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a team member to add skills"
        )
    
    data = {
        "team_id": skill.team_id,
        "skill_name": _validate_skill_name(skill.skill_name),
        "skill_category": skill.skill_category,
        "proficiency_level": skill.proficiency_level.value,
    }

    response = supabase_admin.table("team_skills").insert(data).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data[0]


@router.get("/team-skills/team/{team_id}", response_model=List[TeamSkillResponse])
async def get_team_skills(
    team_id: str,
):
    """Get all skills for a specific team."""
    response = supabase_admin.table("team_skills").select("*").eq("team_id", team_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data


@router.put("/team-skills/{skill_id}", response_model=TeamSkillResponse)
async def update_team_skill(
    skill_id: str,
    skill: TeamSkillUpdate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Update a team skill."""
    # Get the skill to find the team_id
    skill_response = supabase_admin.table("team_skills").select("team_id").eq("id", skill_id).execute()
    if not skill_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    # Check team leadership
    if not _check_team_leadership(skill_response.data[0]["team_id"], current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leaders can update skills"
        )
    
    data = {}
    if skill.skill_name is not None:
        data["skill_name"] = _validate_skill_name(skill.skill_name)
    if skill.skill_category is not None:
        data["skill_category"] = skill.skill_category
    if skill.proficiency_level is not None:
        data["proficiency_level"] = skill.proficiency_level.value

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update",
        )

    response = supabase_admin.table("team_skills").update(data).eq("id", skill_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )

    return response.data[0]


@router.delete("/team-skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team_skill(
    skill_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Delete a team skill."""
    # Get the skill to find the team_id
    skill_response = supabase_admin.table("team_skills").select("team_id").eq("id", skill_id).execute()
    if not skill_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    # Check team leadership
    if not _check_team_leadership(skill_response.data[0]["team_id"], current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leaders can delete skills"
        )
    
    response = supabase_admin.table("team_skills").delete().eq("id", skill_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )


# ========================
# Team Requirements Endpoints
# ========================

@router.post("/team-requirements", response_model=TeamRequirementResponse, status_code=status.HTTP_201_CREATED)
async def create_team_requirement(
    requirement: TeamRequirementCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Create a skill requirement for a team."""
    # Check team membership
    if not _check_team_membership(requirement.team_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a team member to add requirements"
        )
    
    data = {
        "team_id": requirement.team_id,
        "skill_name": _validate_skill_name(requirement.skill_name),
        "skill_category": requirement.skill_category,
        "required_count": requirement.required_count,
        "priority": requirement.priority.value,
        "is_filled": False,
    }

    response = supabase_admin.table("team_requirements").insert(data).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data[0]


@router.get("/team-requirements/team/{team_id}", response_model=List[TeamRequirementResponse])
async def get_team_requirements(
    team_id: str,
):
    """Get all requirements for a specific team."""
    response = supabase_admin.table("team_requirements").select("*").eq("team_id", team_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data


@router.get("/team-requirements/event/{event_id}/unfilled", response_model=List[TeamRequirementResponse])
async def get_unfilled_requirements(
    event_id: str,
):
    """Get unfilled skill requirements for teams in an event (for skill matching)."""
    teams_response = supabase_admin.table("teams").select("id").eq("event_id", event_id).eq("is_public", True).execute()

    if teams_response.error or not teams_response.data:
        return []

    team_ids = [team["id"] for team in teams_response.data]

    response = supabase_admin.table("team_requirements").select("*").in_("team_id", team_ids).eq("is_filled", False).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data


@router.put("/team-requirements/{requirement_id}", response_model=TeamRequirementResponse)
async def update_team_requirement(
    requirement_id: str,
    requirement: TeamRequirementUpdate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Update a team requirement."""
    # Get the requirement to find the team_id
    req_response = supabase_admin.table("team_requirements").select("team_id").eq("id", requirement_id).execute()
    if not req_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )
    
    # Check team leadership
    if not _check_team_leadership(req_response.data[0]["team_id"], current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leaders can update requirements"
        )
    
    data = {}
    if requirement.skill_name is not None:
        data["skill_name"] = _validate_skill_name(requirement.skill_name)
    if requirement.skill_category is not None:
        data["skill_category"] = requirement.skill_category
    if requirement.required_count is not None:
        data["required_count"] = requirement.required_count
    if requirement.priority is not None:
        data["priority"] = requirement.priority.value
    if requirement.is_filled is not None:
        data["is_filled"] = requirement.is_filled

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update",
        )

    response = supabase_admin.table("team_requirements").update(data).eq("id", requirement_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found",
        )

    return response.data[0]


@router.delete("/team-requirements/{requirement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team_requirement(
    requirement_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Delete a team requirement."""
    # Get the requirement to find the team_id
    req_response = supabase_admin.table("team_requirements").select("team_id").eq("id", requirement_id).execute()
    if not req_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )
    
    # Check team leadership
    if not _check_team_leadership(req_response.data[0]["team_id"], current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leaders can delete requirements"
        )
    
    response = supabase_admin.table("team_requirements").delete().eq("id", requirement_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )


# ========================
# User Skills Endpoints
# ========================

@router.post("/user-skills", response_model=UserSkillResponse, status_code=status.HTTP_201_CREATED)
async def create_user_skill(
    skill: UserSkillCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Add a skill to user profile."""
    data = {
        "user_id": current_user.user_id,
        "skill_name": skill.skill_name,
        "skill_category": skill.skill_category,
        "proficiency_level": skill.proficiency_level.value,
        "years_experience": skill.years_experience,
        "is_verified": False,
    }

    response = supabase_admin.table("user_skills").insert(data).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data[0]


@router.get("/my", response_model=List[UserSkillResponse])
async def get_my_skills(
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get current user's skills."""
    response = supabase_admin.table("user_skills").select("*").eq("user_id", current_user.user_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data


@router.get("/user-skills/user/{user_id}", response_model=List[UserSkillResponse])
async def get_user_skills(
    user_id: str,
):
    """Get all skills for a specific user."""
    response = supabase_admin.table("user_skills").select("*").eq("user_id", user_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data


@router.put("/user-skills/{skill_id}", response_model=UserSkillResponse)
async def update_user_skill(
    skill_id: str,
    skill: UserSkillUpdate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Update a user skill."""
    data = {"updated_at": datetime.utcnow().isoformat()}
    if skill.skill_name is not None:
        data["skill_name"] = skill.skill_name
    if skill.skill_category is not None:
        data["skill_category"] = skill.skill_category
    if skill.proficiency_level is not None:
        data["proficiency_level"] = skill.proficiency_level.value
    if skill.years_experience is not None:
        data["years_experience"] = skill.years_experience

    response = supabase_admin.table("user_skills").update(data).eq("id", skill_id).eq("user_id", current_user.user_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )

    return response.data[0]


@router.delete("/user-skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_skill(
    skill_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Delete a user skill."""
    response = supabase_admin.table("user_skills").delete().eq("id", skill_id).eq("user_id", current_user.user_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )


# ========================
# Skill Matching Endpoint
# ========================

@router.get("/match/{event_id}")
async def find_teammates(
    event_id: str,
    skills: str = None,
):
    """Find users with specific skills who are looking for teams in an event."""
    teams_response = supabase_admin.table("teams").select("id").eq("event_id", event_id).eq("is_public", True).execute()

    if teams_response.error or not teams_response.data:
        return {"users": [], "teams": []}

    team_ids = [team["id"] for team in teams_response.data]

    # Get team requirements
    requirements_query = supabase_admin.table("team_requirements").select("*").in_("team_id", team_ids).eq("is_filled", False)
    if skills:
        skills_list = [_validate_skill_name(s) for s in skills.split(",")]
        requirements_query = requirements_query.in_("skill_name", skills_list)
    requirements_response = requirements_query.execute()

    # Get users with matching skills
    users_query = supabase_admin.table("user_skills").select("*")
    if skills:
        users_query = users_query.in_("skill_name", skills_list)
    users_response = users_query.execute()

    return {
        "teams_needing_skill": requirements_response.data if requirements_response.data else [],
        "users_with_skill": users_response.data if users_response.data else [],
    }


@router.get("/available")
async def list_available_skills():
    """Get list of all available skills in the platform."""
    # Get unique skill names from user_skills
    response = supabase_admin.table("user_skills").select("skill_name, skill_category").execute()

    if response.error or not response.data:
        return []

    # Group by skill name
    skills_map = {}
    for item in response.data:
        name = item.get("skill_name")
        if name and name not in skills_map:
            skills_map[name] = {"skill_name": name, "skill_category": item.get("skill_category"), "count": 1}
        elif name:
            skills_map[name]["count"] += 1

    return sorted(skills_map.values(), key=lambda x: x["count"], reverse=True)


# ========================
# Team Invite Endpoints
# ========================

@router.post("/teams/{team_id}/invites", response_model=TeamInviteResponse, status_code=status.HTTP_201_CREATED)
async def create_team_invite(
    team_id: str,
    invite: TeamInviteCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Create a team invite."""
    expires_at = datetime.utcnow() + timedelta(days=7)

    data = {
        "team_id": team_id,
        "inviter_id": current_user.user_id,
        "invitee_email": invite.invitee_email,
        "role": invite.role,
        "message": invite.message,
        "status": InviteStatus.PENDING.value,
        "expires_at": expires_at.isoformat(),
    }

    response = supabase_admin.table("team_invites").insert(data).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data[0]


@router.get("/teams/{team_id}/invites", response_model=List[TeamInviteResponse])
async def get_team_invites(
    team_id: str,
):
    """Get all invites for a specific team."""
    response = supabase_admin.table("team_invites").select("*").eq("team_id", team_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data


@router.get("/invites/my", response_model=List[TeamInviteResponse])
async def get_my_invites(
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get pending invites for current user."""
    response = supabase_admin.table("team_invites").select("*").eq("invitee_id", current_user.user_id).eq("status", "pending").execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    return response.data


@router.put("/invites/{invite_id}", response_model=TeamInviteResponse)
async def respond_to_invite(
    invite_id: str,
    response_update: TeamInviteUpdate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Respond to a team invite (accept/decline)."""
    if response_update.status not in [InviteStatus.ACCEPTED.value, InviteStatus.DECLINED.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid response status",
        )

    data = {
        "status": response_update.status,
        "responded_at": datetime.utcnow().isoformat(),
    }

    response = supabase_admin.table("team_invites").update(data).eq("id", invite_id).eq("invitee_id", current_user.user_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found",
        )

    # If accepted, add user to team
    if response_update.status == InviteStatus.ACCEPTED.value:
        invite_response = supabase_admin.table("team_invites").select("team_id").eq("id", invite_id).execute()
        if invite_response.data:
            supabase_admin.table("team_members").insert({
                "team_id": invite_response.data[0]["team_id"],
                "user_id": current_user.user_id,
                "role": "member",
            }).execute()

    return response.data[0]


@router.delete("/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invite(
    invite_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Delete/cancel a team invite."""
    response = supabase_admin.table("team_invites").delete().eq("id", invite_id).eq("inviter_id", current_user.user_id).execute()

    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message,
        )
