"""
Prizes Router - Phase 6.4: Prize Management
Provides API endpoints for hackathon prize management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from typing import List, Optional
from datetime import datetime
import secrets

from app.supabase import supabase_admin
from app.auth import get_current_user, CurrentUser

router = APIRouter(prefix="/prizes", tags=["prizes"])


# ============================================
# Prize Categories
# ============================================

@router.post("/events/{event_id}/categories")
async def create_prize_category(
    event_id: str,
    category_data: dict,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a prize category (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can create prize categories")
    
    data = category_data.copy()
    data["event_id"] = event_id
    
    result = supabase.table("prize_categories").insert(data).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return result.data[0]


@router.get("/events/{event_id}/categories", response_model=List[dict])
async def list_prize_categories(
    event_id: str,
    supabase: Client = Depends(lambda: supabase_admin)
):
    """List prize categories for an event."""
    response = supabase.table("prize_categories").select("*").eq("event_id", event_id).order("rank").execute()
    return response.data or []


@router.put("/events/{event_id}/categories/{category_id}")
async def update_prize_category(
    event_id: str,
    category_id: str,
    category_data: dict,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a prize category (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can update prize categories")
    
    data = category_data.copy()
    data["updated_at"] = datetime.utcnow().isoformat()
    
    result = supabase.table("prize_categories").update(data).eq("id", category_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return result.data[0]


@router.delete("/events/{event_id}/categories/{category_id}")
async def delete_prize_category(
    event_id: str,
    category_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a prize category (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can delete prize categories")
    
    result = supabase.table("prize_categories").delete().eq("id", category_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return {"message": "Category deleted"}


# ============================================
# Prizes
# ============================================

@router.post("/events/{event_id}")
async def create_prize(
    event_id: str,
    prize_data: dict,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a prize (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can create prizes")
    
    data = prize_data.copy()
    data["event_id"] = event_id
    
    result = supabase.table("prizes").insert(data).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return result.data[0]


@router.get("/events/{event_id}", response_model=List[dict])
async def list_prizes(
    event_id: str,
    supabase: Client = Depends(lambda: supabase_admin)
):
    """List all prizes for an event (public)."""
    response = supabase.table("prizes").select("""
        id,
        event_id,
        category_id,
        name,
        description,
        prize_type,
        value,
        currency,
        sponsor_id,
        image_url,
        is_winner_selected,
        created_at
    """).eq("event_id", event_id).execute()
    return response.data or []


@router.get("/{prize_id}", response_model=dict)
async def get_prize(
    prize_id: str,
    supabase: Client = Depends(lambda: supabase_admin)
):
    """Get a specific prize with winner info."""
    response = supabase.table("prizes").select("""
        id,
        event_id,
        category_id,
        name,
        description,
        prize_type,
        value,
        currency,
        sponsor_id,
        image_url,
        is_winner_selected,
        created_at,
        prize_winners(
            id,
            team_id,
            user_id,
            rank,
            announced_at,
            distribution_status,
            teams(name),
            users(first_name, last_name)
        )
    """).eq("id", prize_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Prize not found")
    
    return response.data[0]


@router.put("/events/{event_id}/{prize_id}")
async def update_prize(
    event_id: str,
    prize_id: str,
    prize_data: dict,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a prize (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can update prizes")
    
    data = prize_data.copy()
    data["updated_at"] = datetime.utcnow().isoformat()
    
    result = supabase.table("prizes").update(data).eq("id", prize_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return result.data[0]


@router.delete("/events/{event_id}/{prize_id}")
async def delete_prize(
    event_id: str,
    prize_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a prize (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can delete prizes")
    
    result = supabase.table("prizes").delete().eq("id", prize_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return {"message": "Prize deleted"}


# ============================================
# Prize Winners
# ============================================

@router.post("/{prize_id}/winners")
async def announce_winner(
    prize_id: str,
    winner_data: dict,  # { "team_id": "...", "user_id": "...", "rank": 1 }
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Announce a prize winner (organizers only)."""
    # Get prize info
    prize_response = supabase.table("prizes").select("event_id").eq("id", prize_id).execute()
    if not prize_response.data:
        raise HTTPException(status_code=404, detail="Prize not found")
    
    event_id = prize_response.data[0]["event_id"]
    
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can announce winners")
    
    data = {
        "prize_id": prize_id,
        "team_id": winner_data.get("team_id"),
        "user_id": winner_data.get("user_id"),
        "rank": winner_data.get("rank", 1),
        "announced_at": datetime.utcnow().isoformat(),
        "distribution_status": "pending"
    }
    
    # Check if winner already exists
    existing = supabase.table("prize_winners").select("*").eq("prize_id", prize_id).execute()
    
    if existing.data:
        # Update existing winner
        result = supabase.table("prize_winners").update(data).eq("prize_id", prize_id).execute()
    else:
        # Insert new winner
        result = supabase.table("prize_winners").insert(data).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    # Mark prize as having winner selected
    supabase.table("prizes").update({"is_winner_selected": True}).eq("id", prize_id).execute()
    
    return result.data[0]


@router.get("/{prize_id}/winners", response_model=List[dict])
async def get_prize_winners(
    prize_id: str,
    supabase: Client = Depends(lambda: supabase_admin)
):
    """Get winners for a prize (public after announcement)."""
    response = supabase.table("prize_winners").select("""
        id,
        prize_id,
        team_id,
        user_id,
        rank,
        announced_at,
        distribution_status,
        teams(name),
        users(first_name, last_name, email)
    """).eq("prize_id", prize_id).execute()
    
    return response.data or []


@router.put("/events/{event_id}/winners/{winner_id}")
async def update_winner_distribution(
    event_id: str,
    winner_id: str,
    update_data: dict,  # { "distribution_status": "sent", "distribution_notes": "..." }
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update winner distribution status (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can update winner distribution")
    
    data = update_data.copy()
    data["updated_at"] = datetime.utcnow().isoformat()
    
    result = supabase.table("prize_winners").update(data).eq("id", winner_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return result.data[0]


@router.delete("/events/{event_id}/winners/{winner_id}")
async def remove_winner(
    event_id: str,
    winner_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Remove a winner announcement (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can remove winners")
    
    # Get prize_id to update
    winner_response = supabase.table("prize_winners").select("prize_id").eq("id", winner_id).execute()
    if not winner_response.data:
        raise HTTPException(status_code=404, detail="Winner not found")
    
    prize_id = winner_response.data[0]["prize_id"]
    
    # Delete winner
    result = supabase.table("prize_winners").delete().eq("id", winner_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    # Check if prize still has winners
    remaining = supabase.table("prize_winners").select("id").eq("prize_id", prize_id).execute()
    if not remaining.data:
        supabase.table("prizes").update({"is_winner_selected": False}).eq("id", prize_id).execute()
    
    return {"message": "Winner removed"}


# ============================================
# Prize Sponsors
# ============================================

@router.post("/events/{event_id}/sponsors")
async def create_prize_sponsor(
    event_id: str,
    sponsor_data: dict,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a prize sponsor (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can create sponsors")
    
    data = sponsor_data.copy()
    data["event_id"] = event_id
    
    result = supabase.table("prize_sponsors").insert(data).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return result.data[0]


@router.get("/events/{event_id}/sponsors", response_model=List[dict])
async def list_prize_sponsors(
    event_id: str,
    supabase: Client = Depends(lambda: supabase_admin)
):
    """List prize sponsors for an event (public)."""
    response = supabase.table("prize_sponsors").select("*").eq("event_id", event_id).order("tier").execute()
    return response.data or []


@router.delete("/events/{event_id}/sponsors/{sponsor_id}")
async def delete_prize_sponsor(
    event_id: str,
    sponsor_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a prize sponsor (organizers only)."""
    # Check organizer permission
    response = supabase.table("user_roles").select("*").eq("event_id", event_id).eq("user_id", current_user.user_id).in_("role", ["organizer", "admin", "super_admin"]).execute()
    
    if not response.data:
        raise HTTPException(status_code=403, detail="Only organizers can delete sponsors")
    
    result = supabase.table("prize_sponsors").delete().eq("id", sponsor_id).execute()
    
    if result.error:
        raise HTTPException(status_code=400, detail=result.error.message)
    
    return {"message": "Sponsor deleted"}


# ============================================
# Public Leaderboard
# ============================================

@router.get("/events/{event_id}/winners", response_model=List[dict])
async def get_event_winners(
    event_id: str,
    supabase: Client = Depends(lambda: supabase_admin)
):
    """Get all announced winners for an event (public)."""
    # Get prizes with their winners
    prizes_response = supabase.table("prizes").select("""
        id,
        name,
        description,
        prize_type,
        value,
        currency,
        category_id,
        prize_categories(name, rank, is_special),
        prize_winners(
            id,
            team_id,
            user_id,
            rank,
            announced_at,
            teams(name),
            users(first_name, last_name)
        )
    """).eq("event_id", event_id).execute()
    
    if not prizes_response.data:
        return []
    
    # Format response
    winners = []
    for prize in prizes_response.data:
        if prize.get("prize_winners"):
            for winner in prize["prize_winners"]:
                winners.append({
                    "prize_name": prize["name"],
                    "prize_type": prize["prize_type"],
                    "value": prize["value"],
                    "currency": prize["currency"],
                    "category_name": prize["prize_categories"]["name"] if prize.get("prize_categories") else None,
                    "category_rank": prize["prize_categories"]["rank"] if prize.get("prize_categories") else None,
                    "is_special": prize["prize_categories"]["is_special"] if prize.get("prize_categories") else False,
                    "winner_rank": winner["rank"],
                    "team_name": winner["teams"]["name"] if winner.get("teams") else None,
                    "winner_name": f"{winner['users']['first_name']} {winner['users']['last_name']}" if winner.get("users") else None,
                    "announced_at": winner["announced_at"]
                })
    
    # Sort by category rank, then winner rank
    winners.sort(key=lambda x: (x.get("category_rank", 0), x.get("winner_rank", 0)))
    
    return winners


# ============================================
# Prize Claims
# ============================================

@router.post("/winners/{winner_id}/claim")
async def claim_prize(
    winner_id: str,
    supabase: Client = Depends(lambda: supabase_admin),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Claim a prize (winner only)."""
    # Verify user is the winner
    winner_response = supabase.table("prize_winners").select("""
        id,
        user_id,
        team_id,
        prize_id,
        distribution_status
    """).eq("id", winner_id).execute()
    
    if not winner_response.data:
        raise HTTPException(status_code=404, detail="Winner not found")
    
    winner = winner_response.data[0]
    
    # Check if user owns this prize
    is_owner = False
    if winner["user_id"] == current_user.user_id:
        is_owner = True
    else:
        # Check if user is team member
        if winner["team_id"]:
            team_member = supabase.table("team_members").select("id").eq("team_id", winner["team_id"]).eq("user_id", current_user.user_id).execute()
            if team_member.data:
                is_owner = True
    
    if not is_owner:
        raise HTTPException(status_code=403, detail="You can only claim your own prize")
    
    # Check if already claimed
    if winner["distribution_status"] in ["sent", "claimed"]:
        raise HTTPException(status_code=400, detail="Prize already claimed")
    
    # Generate claim token
    claim_token = secrets.token_urlsafe(32)
    
    # Create claim record
    claim_data = {
        "winner_id": winner_id,
        "claim_token": claim_token,
        "claimed_at": datetime.utcnow().isoformat()
    }
    
    claim_result = supabase.table("prize_claims").insert(claim_data).execute()
    
    if claim_result.error:
        raise HTTPException(status_code=400, detail=claim_result.error.message)
    
    # Update distribution status
    supabase.table("prize_winners").update({
        "distribution_status": "claimed",
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", winner_id).execute()
    
    return {"message": "Prize claimed successfully", "claim_token": claim_token}
