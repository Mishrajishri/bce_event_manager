"""Communication Router - Email, Push Notifications, and Queue Management."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import json

from app.supabase import supabase_admin
from app.auth import get_current_user, require_organizer, CurrentUser
from app.services.email import email_service, email_queue_processor

router = APIRouter(prefix="/communication", tags=["Communication"])


# ============================================
# Pydantic Models
# ============================================

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict
    browser: Optional[str] = None


class PushSubscriptionResponse(BaseModel):
    id: str
    user_id: str
    endpoint: str
    browser: Optional[str]
    created_at: str


class EmailTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    subject: str = Field(..., min_length=1, max_length=255)
    body_html: str
    body_text: Optional[str] = None
    event_type: Optional[str] = None


class EmailTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    event_type: Optional[str] = None


class EmailTemplateResponse(BaseModel):
    id: str
    name: str
    subject: str
    body_html: str
    body_text: Optional[str]
    event_type: Optional[str]
    created_at: str


class EmailQueueCreate(BaseModel):
    to_email: str
    to_name: Optional[str] = None
    subject: str
    body_html: Optional[str] = None
    template_name: Optional[str] = None
    template_data: dict = {}
    scheduled_at: Optional[datetime] = None
    priority: int = 0


class EmailQueueResponse(BaseModel):
    id: str
    to_email: str
    to_name: Optional[str]
    subject: str
    template_id: Optional[str]
    status: str
    attempts: int
    sent_at: Optional[str]
    error_message: Optional[str]
    created_at: str
    scheduled_at: Optional[str]


class SendEmailDirect(BaseModel):
    to_email: str
    to_name: Optional[str] = None
    subject: str
    body_html: Optional[str] = None
    body_text: Optional[str] = None


# ============================================
# 9.1 Push Notifications
# ============================================

@router.post("/push/subscribe", response_model=PushSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def subscribe_to_push(
    subscription: PushSubscriptionCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Subscribe to push notifications."""
    # Check if subscription already exists
    existing = supabase_admin.table("push_subscriptions").select("*").eq("endpoint", subscription.endpoint).execute()
    
    if existing.data:
        # Update existing subscription with user_id
        response = supabase_admin.table("push_subscriptions").update({
            "user_id": current_user.id,
            "browser": subscription.browser,
        }).eq("endpoint", subscription.endpoint).execute()
    else:
        # Create new subscription
        data = {
            "user_id": current_user.id,
            "endpoint": subscription.endpoint,
            "keys": subscription.keys,
            "browser": subscription.browser,
        }
        response = supabase_admin.table("push_subscriptions").insert(data).execute()
    
    return PushSubscriptionResponse(
        id=response.data[0]["id"],
        user_id=current_user.id,
        endpoint=subscription.endpoint,
        browser=subscription.browser,
        created_at=response.data[0]["created_at"]
    )


@router.delete("/push/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Unsubscribe from push notifications."""
    supabase_admin.table("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", current_user.id).execute()
    return {"message": "Unsubscribed successfully"}


@router.get("/push/subscriptions", response_model=List[PushSubscriptionResponse])
async def list_push_subscriptions(
    current_user: CurrentUser = Depends(get_current_user),
):
    """List user's push subscriptions."""
    response = supabase_admin.table("push_subscriptions").select("*").eq("user_id", current_user.id).execute()
    return [PushSubscriptionResponse(**item) for item in response.data]


# ============================================
# 9.2 Email Templates (Admin)
# ============================================

@router.post("/email/templates", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_email_template(
    template: EmailTemplateCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new email template (admin only)."""
    # Check admin role
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can create email templates")
    
    # Check for duplicate name
    existing = supabase_admin.table("email_templates").select("id").eq("name", template.name).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Template with this name already exists")
    
    data = template.model_dump()
    response = supabase_admin.table("email_templates").insert(data).execute()
    
    return EmailTemplateResponse(**response.data[0])


@router.get("/email/templates", response_model=List[EmailTemplateResponse])
async def list_email_templates(
    event_type: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all email templates."""
    query = supabase_admin.table("email_templates").select("*")
    
    if event_type:
        query = query.or_(f"event_type.eq.{event_type},event_type.is.null")
    
    response = query.execute()
    return [EmailTemplateResponse(**item) for item in response.data]


@router.get("/email/templates/{template_id}", response_model=EmailTemplateResponse)
async def get_email_template(
    template_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a specific email template."""
    response = supabase_admin.table("email_templates").select("*").eq("id", template_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return EmailTemplateResponse(**response.data[0])


@router.put("/email/templates/{template_id}", response_model=EmailTemplateResponse)
async def update_email_template(
    template_id: str,
    template: EmailTemplateUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update an email template (admin only)."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can update email templates")
    
    data = template.model_dump(exclude_unset=True)
    data["updated_at"] = datetime.utcnow().isoformat()
    
    response = supabase_admin.table("email_templates").update(data).eq("id", template_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return EmailTemplateResponse(**response.data[0])


@router.delete("/email/templates/{template_id}")
async def delete_email_template(
    template_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete an email template (admin only)."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete email templates")
    
    supabase_admin.table("email_templates").delete().eq("id", template_id).execute()
    return {"message": "Template deleted"}


# ============================================
# 9.3 Email Queue
# ============================================

@router.post("/email/queue", response_model=EmailQueueResponse, status_code=status.HTTP_201_CREATED)
async def queue_email(
    email: EmailQueueCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Add an email to the queue."""
    if current_user.role not in ["admin", "super_admin", "organizer"]:
        raise HTTPException(status_code=403, detail="Not authorized to queue emails")
    
    # Get template_id if template_name provided
    template_id = None
    if email.template_name:
        template_resp = supabase_admin.table("email_templates").select("id").eq("name", email.template_name).execute()
        if template_resp.data:
            template_id = template_resp.data[0]["id"]
    
    data = {
        "to_email": email.to_email,
        "to_name": email.to_name,
        "subject": email.subject,
        "body_html": email.body_html,
        "template_id": template_id,
        "template_data": email.template_data,
        "scheduled_at": email.scheduled_at.isoformat() if email.scheduled_at else None,
        "priority": email.priority,
        "status": "pending",
    }
    
    response = supabase_admin.table("email_queue").insert(data).execute()
    
    return EmailQueueResponse(**response.data[0])


@router.get("/email/queue", response_model=List[EmailQueueResponse])
async def list_email_queue(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List emails in the queue."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = supabase_admin.table("email_queue").select("*").order("created_at", desc=True).limit(limit)
    
    if status_filter:
        query = query.eq("status", status_filter)
    
    response = query.execute()
    return [EmailQueueResponse(**item) for item in response.data]


@router.post("/email/queue/{email_id}/cancel")
async def cancel_queued_email(
    email_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Cancel a queued email."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    supabase_admin.table("email_queue").update({
        "status": "cancelled"
    }).eq("id", email_id).eq("status", "pending").execute()
    
    return {"message": "Email cancelled"}


@router.post("/email/queue/process")
async def process_email_queue(
    batch_size: int = Query(10, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Process queued emails (typically called by a cron job)."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    processed = await email_queue_processor.process_queue(batch_size)
    
    return {
        "processed": processed,
        "message": f"Processed {processed} emails"
    }


# ============================================
# 9.4 Direct Email Sending
# ============================================

@router.post("/email/send")
async def send_email_direct(
    email: SendEmailDirect,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Send an email directly (admin only)."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to send direct emails")
    
    result = await email_service.send_email(
        to_email=email.to_email,
        subject=email.subject,
        html_content=email.body_html,
        text_content=email.body_text,
    )
    
    # Log the email
    supabase_admin.table("email_log").insert({
        "message_id": result.get("message_id"),
        "to_email": email.to_email,
        "subject": email.subject,
        "status": "sent" if result.get("success") else "failed",
        "error_message": result.get("error"),
    }).execute()
    
    return result


# ============================================
# 9.5 Email Logs
# ============================================

@router.get("/email/logs")
async def list_email_logs(
    limit: int = 50,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List sent email logs."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    response = supabase_admin.table("email_log").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    
    total = supabase_admin.table("email_log").select("id", count="exact").execute()
    
    return {
        "logs": response.data,
        "total": total.count or 0,
        "limit": limit,
        "offset": offset,
    }


@router.get("/email/logs/stats")
async def get_email_stats(
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get email sending statistics."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get counts by status
    pending = supabase_admin.table("email_queue").select("id", count="exact").eq("status", "pending").execute()
    sent = supabase_admin.table("email_log").select("id", count="exact").execute()
    failed = supabase_admin.table("email_queue").select("id", count="exact").eq("status", "failed").execute()
    
    return {
        "pending": pending.count or 0,
        "sent_today": sent.count or 0,
        "failed": failed.count or 0,
    }


# ============================================
# 9.6 Bulk Email
# ============================================

@router.post("/email/bulk")
async def send_bulk_emails(
    emails: List[SendEmailDirect],
    current_user: CurrentUser = Depends(get_current_user),
):
    """Send multiple emails at once (admin only)."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to send bulk emails")
    
    email_list = [email.model_dump() for email in emails]
    results = await email_service.send_bulk_emails(email_list)
    
    return {
        "sent": len([r for r in results if r.get("success")]),
        "failed": len([r for r in results if not r.get("success")]),
        "results": results
    }
