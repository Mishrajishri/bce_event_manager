"""Registrations API routes."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Optional
import uuid
import io

from app.models import (
    RegistrationCreate,
    RegistrationUpdate,
    RegistrationResponse,
    RegistrationStatus,
    PaymentStatus,
    CheckInResponse,
)
from app.auth import CurrentUser, get_current_user, require_any_user
from app.supabase import supabase_admin


router = APIRouter(tags=["Registrations"])


def _generate_qr_code(registration_id: str) -> str:
    """Generate a unique QR code string for a registration."""
    return f"BCE-REG-{registration_id}-{uuid.uuid4().hex[:8]}"


@router.post("/events/{event_id}/register", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_for_event(
    event_id: str,
    reg_data: RegistrationCreate,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Register for an event. Generates a QR code for check-in."""
    # Verify event exists
    event_response = supabase_admin.table("events").select("*").eq("id", event_id).execute()

    if not event_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    event = event_response.data[0]

    if event["status"] not in ["draft", "published"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration is closed for this event")

    # Check deadline (UTC)
    registration_deadline = event.get("registration_deadline")
    if registration_deadline:
        if isinstance(registration_deadline, str):
            deadline_dt = datetime.fromisoformat(registration_deadline.replace('Z', '+00:00'))
        else:
            deadline_dt = registration_deadline
        if datetime.now(timezone.utc) > deadline_dt.replace(tzinfo=timezone.utc) if not deadline_dt.tzinfo else deadline_dt:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration deadline has passed")

    # Check duplicates
    existing = supabase_admin.table("registrations").select("id").eq("event_id", event_id).eq("user_id", current_user.user_id).execute()
    if existing.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already registered for this event")

    # Check capacity
    current_count = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event_id).eq("status", "confirmed").execute()
    if current_count.count and current_count.count >= event["max_participants"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is full")

    # Create registration with QR code
    qr_code = _generate_qr_code(str(uuid.uuid4()))
    data = {
        "user_id": current_user.user_id,
        "event_id": event_id,
        "team_id": reg_data.team_id,
        "status": RegistrationStatus.PENDING.value,
        "payment_status": PaymentStatus.UNPAID.value,
        "payment_amount": reg_data.payment_amount,
        "qr_code": qr_code,
    }

    response = supabase_admin.table("registrations").insert(data).execute()

    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to register for event")

    return RegistrationResponse(**response.data[0])


@router.get("/registrations/{registration_id}/qr", tags=["QR Check-in"])
async def get_qr_code_image(
    registration_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get the QR code image (PNG) for a registration."""
    import qrcode

    reg_resp = supabase_admin.table("registrations").select("qr_code, user_id").eq("id", registration_id).execute()

    if not reg_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")

    reg = reg_resp.data[0]
    if reg["user_id"] != current_user.user_id and current_user.role not in ("super_admin", "organizer"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    qr_string = reg.get("qr_code") or f"BCE-REG-{registration_id}"

    img = qrcode.make(qr_string)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return StreamingResponse(buffer, media_type="image/png")


@router.post("/events/{event_id}/check-in", response_model=CheckInResponse, tags=["QR Check-in"])
async def check_in(
    event_id: str,
    qr_code: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Scan a QR code to check in a participant. Organizer/Super Admin only."""
    if current_user.role not in ("super_admin", "organizer"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organizers can check in participants")

    reg_resp = (
        supabase_admin.table("registrations")
        .select("id, user_id, event_id, checked_in_at")
        .eq("event_id", event_id)
        .eq("qr_code", qr_code)
        .execute()
    )

    if not reg_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid QR code or registration not found")

    reg = reg_resp.data[0]

    if reg.get("checked_in_at"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Participant already checked in")

    now = datetime.now(timezone.utc)
    supabase_admin.table("registrations").update({"checked_in_at": now.isoformat()}).eq("id", reg["id"]).execute()

    return CheckInResponse(
        registration_id=reg["id"],
        user_id=reg["user_id"],
        event_id=reg["event_id"],
        checked_in_at=now,
        message="Check-in successful!",
    )


@router.get("/my", response_model=List[RegistrationResponse])
async def my_registrations(
    current_user: CurrentUser = Depends(require_any_user),
):
    """Get current user's registrations."""
    response = supabase_admin.table("registrations").select("*").eq("user_id", current_user.user_id).order("registered_at", desc=True).execute()
    return [RegistrationResponse(**item) for item in response.data]


@router.get("/events/{event_id}/registrations", response_model=List[RegistrationResponse])
async def list_event_registrations(
    event_id: str,
    status_filter: Optional[RegistrationStatus] = None,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all registrations for an event (organizer/super_admin only)."""
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()

    if not event_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    event = event_response.data[0]

    if current_user.role not in ("super_admin",) and event["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view registrations for this event")

    query = supabase_admin.table("registrations").select("*").eq("event_id", event_id)

    if status_filter:
        query = query.eq("status", status_filter.value)

    response = query.order("registered_at", desc=True).execute()
    return [RegistrationResponse(**item) for item in response.data]


@router.get("/events/{event_id}/registrations/export", tags=["CSV Export"])
async def export_registrations_csv(
    event_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Export event registrations as CSV (organizer/super_admin only)."""
    import csv

    event_response = supabase_admin.table("events").select("organizer_id, name").eq("id", event_id).execute()
    if not event_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    event = event_response.data[0]
    if current_user.role not in ("super_admin",) and event["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    regs = supabase_admin.table("registrations").select("*").eq("event_id", event_id).execute()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "User ID", "Status", "Payment Status", "Amount", "Checked In", "Registered At"])
    for r in regs.data:
        writer.writerow([r["id"], r["user_id"], r["status"], r["payment_status"], r["payment_amount"], r.get("checked_in_at", ""), r["registered_at"]])

    output.seek(0)
    filename = f"registrations_{event['name'].replace(' ', '_')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.put("/{registration_id}/status", response_model=RegistrationResponse)
async def update_registration_status(
    registration_id: str,
    reg_data: RegistrationUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update registration status (organizer only)."""
    reg_response = supabase_admin.table("registrations").select("*").eq("id", registration_id).execute()

    if not reg_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")

    registration = reg_response.data[0]
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", registration["event_id"]).execute()

    if not event_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    event = event_response.data[0]
    if current_user.role not in ("super_admin",) and event["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to update registrations for this event")

    update_data = {k: v for k, v in reg_data.model_dump().items() if v is not None}
    response = supabase_admin.table("registrations").update(update_data).eq("id", registration_id).execute()

    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update registration")

    return RegistrationResponse(**response.data[0])


@router.delete("/{registration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_registration(
    registration_id: str,
    current_user: CurrentUser = Depends(require_any_user),
):
    """Delete a registration (user cancels their registration)."""
    reg_response = supabase_admin.table("registrations").select("*").eq("id", registration_id).execute()

    if not reg_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")

    registration = reg_response.data[0]

    if registration["user_id"] != current_user.user_id:
        event_response = supabase_admin.table("events").select("organizer_id").eq("id", registration["event_id"]).execute()
        if not event_response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        event = event_response.data[0]
        if current_user.role not in ("super_admin",) and event["organizer_id"] != current_user.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to delete this registration")

    supabase_admin.table("registrations").delete().eq("id", registration_id).execute()

