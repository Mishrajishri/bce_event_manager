"""Certificate generation API routes."""
import re
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import io

from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

from app.auth import CurrentUser, get_current_user
from app.supabase import supabase_admin

router = APIRouter(prefix="/events/{event_id}/certificate", tags=["Certificates"])


@router.get("/")
async def generate_certificate(
    event_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Generate a participation/winner certificate PDF for the current user.
    Only available for completed events where the user is registered.
    """
    # Verify event exists and is completed
    event_resp = (
        supabase_admin.table("events")
        .select("id, name, start_date, end_date, venue, status")
        .eq("id", event_id)
        .execute()
    )
    if not event_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    event = event_resp.data[0]
    if event["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificates are only available for completed events",
        )

    # Verify user was registered
    reg_resp = (
        supabase_admin.table("registrations")
        .select("id, status")
        .eq("event_id", event_id)
        .eq("user_id", current_user.user_id)
        .execute()
    )
    if not reg_resp.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not registered for this event",
        )

    # Get user metadata
    user_resp = supabase_admin.auth.admin.get_user_by_id(current_user.user_id)
    meta = user_resp.user.user_metadata or {}
    full_name = f"{meta.get('first_name', '')} {meta.get('last_name', '')}".strip() or current_user.email

    # Generate PDF
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    # Background
    c.setFillColor(HexColor("#f8f4ff"))
    c.rect(0, 0, width, height, fill=True, stroke=False)

    # Border
    c.setStrokeColor(HexColor("#7c3aed"))
    c.setLineWidth(4)
    c.rect(30, 30, width - 60, height - 60, fill=False, stroke=True)

    # Inner border
    c.setStrokeColor(HexColor("#c4b5fd"))
    c.setLineWidth(1.5)
    c.rect(45, 45, width - 90, height - 90, fill=False, stroke=True)

    # Title
    c.setFillColor(HexColor("#7c3aed"))
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(width / 2, height - 120, "Certificate of Participation")

    # Subtitle
    c.setFillColor(HexColor("#4b5563"))
    c.setFont("Helvetica", 16)
    c.drawCentredString(width / 2, height - 160, "This is to certify that")

    # Name
    c.setFillColor(HexColor("#1e1b4b"))
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2, height - 210, full_name)

    # Line under name
    c.setStrokeColor(HexColor("#c4b5fd"))
    c.setLineWidth(1)
    name_width = c.stringWidth(full_name, "Helvetica-Bold", 28)
    c.line(
        width / 2 - name_width / 2 - 20, height - 218,
        width / 2 + name_width / 2 + 20, height - 218,
    )

    # Body text
    c.setFillColor(HexColor("#4b5563"))
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 260, "has successfully participated in")

    # Event name
    c.setFillColor(HexColor("#7c3aed"))
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 295, event["name"])

    # Event details
    c.setFillColor(HexColor("#6b7280"))
    c.setFont("Helvetica", 12)
    c.drawCentredString(
        width / 2, height - 330,
        f"Venue: {event['venue']}  |  Date: {event['start_date'][:10]}",
    )

    # Footer
    c.setFillColor(HexColor("#9ca3af"))
    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, 70, "BCE Event Manager — Powered by Supabase")

    c.save()
    buffer.seek(0)

    # Sanitize filename — strip everything except alnum, hyphens, underscores
    safe_event = re.sub(r'[^\w\-]', '_', event['name'])
    safe_name = re.sub(r'[^\w\-]', '_', full_name)
    filename = f"certificate_{safe_event}_{safe_name}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
