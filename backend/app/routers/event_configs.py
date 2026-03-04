"""Event Type Configs Router - API endpoints for managing event type specific configurations."""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client, Client
from typing import List, Optional
from datetime import datetime
import os

from ..models.schemas import (
    EventTypeConfigCreate,
    EventTypeConfigResponse,
    EventTypeConfigBase
)

router = APIRouter(prefix="/event-configs", tags=["Event Configs"])


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


@router.post("/", response_model=EventTypeConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_event_config(
    config: EventTypeConfigCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new event type configuration."""
    data = {
        "event_id": config.event_id,
        "config_type": config.config_type,
        "config_data": config.config_data
    }
    
    response = supabase.table("event_type_configs").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/event/{event_id}", response_model=List[EventTypeConfigResponse])
async def get_event_configs(
    event_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get all configurations for a specific event."""
    response = supabase.table("event_type_configs").select("*").eq("event_id", event_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


@router.get("/{config_id}", response_model=EventTypeConfigResponse)
async def get_config(
    config_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get a specific configuration by ID."""
    response = supabase.table("event_type_configs").select("*").eq("id", config_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found"
        )
    
    return response.data[0]


@router.put("/{config_id}", response_model=EventTypeConfigResponse)
async def update_config(
    config_id: str,
    config: EventTypeConfigBase,
    supabase: Client = Depends(get_supabase_client)
):
    """Update an event configuration."""
    data = {
        "config_type": config.config_type,
        "config_data": config.config_data,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    response = supabase.table("event_type_configs").update(data).eq("id", config_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found"
        )
    
    return response.data[0]


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(
    config_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete an event configuration."""
    response = supabase.table("event_type_configs").delete().eq("id", config_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )


@router.get("/event/{event_id}/type/{config_type}", response_model=EventTypeConfigResponse)
async def get_event_config_by_type(
    event_id: str,
    config_type: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get a specific type of configuration for an event."""
    response = supabase.table("event_type_configs").select("*").eq("event_id", event_id).eq("config_type", config_type).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration of type '{config_type}' not found for this event"
        )
    
    return response.data[0]
