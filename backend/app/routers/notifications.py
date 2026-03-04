"""Notifications Router - API endpoints for managing user notifications and preferences."""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime

from ..models.schemas import (
    NotificationCreate,
    NotificationResponse,
    NotificationUpdate,
    NotificationPreferencesCreate,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate
)
from app.supabase import supabase_admin
from app.auth import CurrentUser, require_any_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ========================
# Notification Endpoints
# ========================

@router.get("/", response_model=List[NotificationResponse])
async def get_my_notifications(
    current_user: CurrentUser = Depends(require_any_user),
    unread_only: bool = False,
    limit: int = 50,
):
    """Get current user's notifications."""
    query = supabase_admin.table("notifications").select("*").eq("user_id", current_user.user_id).order("created_at", desc=True).limit(limit)
    
    if unread_only:
        query = query.eq("is_read", False)
    
    response = query.execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


@router.get("/unread-count")
async def get_my_unread_count(
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get count of unread notifications for current user."""
    response = supabase_admin.table("notifications").select("id", count="exact").eq("user_id", current_user.user_id).eq("is_read", False).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return {"unread_count": response.count}


@router.put("/read-all")
async def mark_all_my_notifications_as_read(
    current_user: CurrentUser = Depends(require_any_user),
):
    """Mark all notifications as read for current user."""
    response = supabase_admin.table("notifications").update({"is_read": True}).eq("user_id", current_user.user_id).eq("is_read", False).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return {"message": "All notifications marked as read", "updated_count": len(response.data) if response.data else 0}


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_my_preferences(
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get current user's notification preferences."""
    response = supabase_admin.table("notification_preferences").select("*").eq("user_id", current_user.user_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if not response.data:
        # Return default preferences if none exist
        return {
            "id": None,
            "user_id": current_user.user_id,
            "email_enabled": True,
            "push_enabled": True,
            "event_reminders": True,
            "team_updates": True,
            "new_announcements": True,
            "judging_updates": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
    
    return response.data[0]


@router.put("/preferences", response_model=NotificationPreferencesResponse)
async def update_my_preferences(
    preferences: NotificationPreferencesUpdate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Update current user's notification preferences."""
    data = {"updated_at": datetime.utcnow().isoformat()}
    
    if preferences.email_enabled is not None:
        data["email_enabled"] = preferences.email_enabled
    if preferences.push_enabled is not None:
        data["push_enabled"] = preferences.push_enabled
    if preferences.event_reminders is not None:
        data["event_reminders"] = preferences.event_reminders
    if preferences.team_updates is not None:
        data["team_updates"] = preferences.team_updates
    if preferences.new_announcements is not None:
        data["new_announcements"] = preferences.new_announcements
    if preferences.judging_updates is not None:
        data["judging_updates"] = preferences.judging_updates
    
    # Check if preferences exist
    existing = supabase_admin.table("notification_preferences").select("id").eq("user_id", current_user.user_id).execute()
    
    if existing.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=existing.error.message
        )
    
    if not existing.data:
        # Create new preferences
        data["user_id"] = current_user.user_id
        response = supabase_admin.table("notification_preferences").insert(data).execute()
    else:
        # Update existing
        response = supabase_admin.table("notification_preferences").update(data).eq("user_id", current_user.user_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification: NotificationCreate,
):
    """Create a new notification."""
    data = {
        "user_id": notification.user_id,
        "type": notification.type.value,
        "title": notification.title,
        "message": notification.message,
        "link": notification.link,
        "is_read": False
    }
    
    response = supabase_admin.table("notifications").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/user/{user_id}", response_model=List[NotificationResponse])
async def get_user_notifications(
    user_id: str,
    current_user: CurrentUser = Depends(require_any_user),
    unread_only: bool = False,
):
    """Get all notifications for a user."""
    # Verify user can only access their own notifications
    if current_user.user_id != user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    query = supabase_admin.table("notifications").select("*").eq("user_id", user_id).order("created_at", desc=True)
    
    if unread_only:
        query = query.eq("is_read", False)
    
    response = query.execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data


@router.get("/user/{user_id}/unread-count")
async def get_unread_count(
    user_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get count of unread notifications for a user."""
    # Verify user can only access their own notification count
    if current_user.user_id != user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    response = supabase_admin.table("notifications").select("id", count="exact").eq("user_id", user_id).eq("is_read", False).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return {"unread_count": response.count}


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get a specific notification by ID."""
    response = supabase_admin.table("notifications").select("*").eq("id", notification_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Verify user owns this notification or is admin
    if response.data[0]["user_id"] != current_user.user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return response.data[0]


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Mark a notification as read."""
    # Get notification first to verify ownership
    notification = supabase_admin.table("notifications").select("user_id").eq("id", notification_id).execute()
    
    if not notification.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Verify user owns this notification or is admin
    if notification.data[0]["user_id"] != current_user.user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    response = supabase_admin.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return response.data[0]


@router.put("/user/{user_id}/read-all")
async def mark_all_as_read(
    user_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Mark all notifications as read for a user."""
    # Verify user can only access their own notifications
    if current_user.user_id != user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    response = supabase_admin.table("notifications").update({"is_read": True}).eq("user_id", user_id).eq("is_read", False).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return {"message": "All notifications marked as read", "updated_count": len(response.data) if response.data else 0}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Delete a notification."""
    # Get notification first to verify ownership
    notification = supabase_admin.table("notifications").select("user_id").eq("id", notification_id).execute()
    
    if not notification.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Verify user owns this notification or is admin
    if notification.data[0]["user_id"] != current_user.user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    response = supabase_admin.table("notifications").delete().eq("id", notification_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )


@router.delete("/user/{user_id}/clear")
async def clear_user_notifications(
    user_id: str,
    current_user: CurrentUser = Depends(require_any_user),
    unread_only: bool = False,
):
    """Clear notifications for a user."""
    # Verify user can only clear their own notifications
    if current_user.user_id != user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    query = supabase_admin.table("notifications").delete().eq("user_id", user_id)
    
    if unread_only:
        query = query.eq("is_read", False)
    
    response = query.execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return {"message": "Notifications cleared", "deleted_count": len(response.data) if response.data else 0}


# ========================
# Notification Preferences Endpoints
# ========================

@router.post("/preferences", response_model=NotificationPreferencesResponse, status_code=status.HTTP_201_CREATED)
async def create_preferences(
    preferences: NotificationPreferencesCreate,
):
    """Create notification preferences for a user."""
    data = {
        "user_id": preferences.user_id,
        "email_enabled": preferences.email_enabled,
        "push_enabled": preferences.push_enabled,
        "event_reminders": preferences.event_reminders,
        "team_updates": preferences.team_updates,
        "new_announcements": preferences.new_announcements,
        "judging_updates": preferences.judging_updates
    }
    
    response = supabase_admin.table("notification_preferences").insert(data).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]


@router.get("/preferences/user/{user_id}", response_model=NotificationPreferencesResponse)
async def get_preferences(
    user_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get notification preferences for a user."""
    # Verify user can only access their own preferences
    if current_user.user_id != user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    response = supabase_admin.table("notification_preferences").select("*").eq("user_id", user_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    if not response.data:
        # Return default preferences if none exist
        return {
            "id": None,
            "user_id": user_id,
            "email_enabled": True,
            "push_enabled": True,
            "event_reminders": True,
            "team_updates": True,
            "new_announcements": True,
            "judging_updates": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
    
    return response.data[0]


@router.put("/preferences/user/{user_id}", response_model=NotificationPreferencesResponse)
async def update_preferences(
    user_id: str,
    preferences: NotificationPreferencesUpdate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Update notification preferences for a user."""
    # Verify user can only update their own preferences
    if current_user.user_id != user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    data = {"updated_at": datetime.utcnow().isoformat()}
    
    if preferences.email_enabled is not None:
        data["email_enabled"] = preferences.email_enabled
    if preferences.push_enabled is not None:
        data["push_enabled"] = preferences.push_enabled
    if preferences.event_reminders is not None:
        data["event_reminders"] = preferences.event_reminders
    if preferences.team_updates is not None:
        data["team_updates"] = preferences.team_updates
    if preferences.new_announcements is not None:
        data["new_announcements"] = preferences.new_announcements
    if preferences.judging_updates is not None:
        data["judging_updates"] = preferences.judging_updates
    
    # Check if preferences exist
    existing = supabase_admin.table("notification_preferences").select("id").eq("user_id", user_id).execute()
    
    if existing.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=existing.error.message
        )
    
    if not existing.data:
        # Create new preferences
        data["user_id"] = user_id
        response = supabase_admin.table("notification_preferences").insert(data).execute()
    else:
        # Update existing
        response = supabase_admin.table("notification_preferences").update(data).eq("user_id", user_id).execute()
    
    if response.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.error.message
        )
    
    return response.data[0]
