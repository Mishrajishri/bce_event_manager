
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.auth import CurrentUser, require_organizer, get_current_user_optional, get_current_user
from app.supabase import supabase_admin
from app.models.schemas import (
    CulturalPerformanceCreate, CulturalPerformanceResponse,
    PerformanceRequirementCreate, PerformanceRequirementResponse,
    PerformanceStatus
)

router = APIRouter(prefix="/events/{event_id}/cultural", tags=["Cultural"])

@router.post("/performances", response_model=CulturalPerformanceResponse, status_code=status.HTTP_201_CREATED)
async def create_performance(
    event_id: str,
    performance: CulturalPerformanceCreate,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Submit a performance for an event."""
    
    # Verify event exists
    event = supabase_admin.table("events").select("id").eq("id", event_id).execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")

    data = performance.dict()
    data["event_id"] = event_id
    data["status"] = PerformanceStatus.PENDING.value
    
    response = supabase_admin.table("cultural_performances").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create performance")
    return response.data[0]

@router.get("/performances", response_model=List[CulturalPerformanceResponse])
async def list_performances(event_id: str):
    """List all performances for an event."""
    response = supabase_admin.table("cultural_performances").select("*").eq("event_id", event_id).execute()
    return response.data

@router.post("/performances/{performance_id}/requirements", response_model=PerformanceRequirementResponse)
async def add_requirement(
    performance_id: str,
    requirement: PerformanceRequirementCreate,
    current_user: CurrentUser = Depends(get_current_user_optional)
):
    """Add a technical requirement for a performance."""
    data = requirement.dict()
    data["performance_id"] = performance_id
    response = supabase_admin.table("performance_requirements").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to add requirement")
    return response.data[0]

@router.patch("/performances/{performance_id}/status", response_model=CulturalPerformanceResponse)
async def update_performance_status(
    performance_id: str,
    status_update: dict,
    current_user: CurrentUser = Depends(require_organizer)
):
    """Update performance status (approve/reject/schedule)."""
    response = supabase_admin.table("cultural_performances").update(status_update).eq("id", performance_id).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to update performance")
    return response.data[0]
