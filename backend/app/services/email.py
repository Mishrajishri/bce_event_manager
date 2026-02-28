"""Email notification service using Resend API (free tier: 100 emails/day)."""
import os
import httpx
import logging

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")


async def send_email(to: str, subject: str, html: str) -> bool:
    """
    Send an email using Resend API.

    Args:
        to: Recipient email address
        subject: Email subject line
        html: HTML body content

    Returns:
        True if email sent successfully, False otherwise
    """
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — email not sent")
        return False

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": FROM_EMAIL,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
            )
            if response.status_code in (200, 201):
                logger.info(f"Email sent to {to}: {subject}")
                return True
            else:
                logger.error(f"Email failed: {response.status_code} {response.text}")
                return False
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return False


# --- Pre-built email templates ---

async def send_registration_confirmation(to: str, event_name: str, qr_code: str) -> bool:
    """Send registration confirmation with QR code reference."""
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 32px; border-radius: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">🎉 Registration Confirmed!</h1>
        </div>
        <div style="padding: 24px; background: #faf5ff; border-radius: 0 0 20px 20px;">
            <p>You have successfully registered for <strong>{event_name}</strong>.</p>
            <p>Your QR code for check-in: <code>{qr_code}</code></p>
            <p>Show this QR code at the event venue for a quick check-in.</p>
            <hr style="border: 1px solid #e9d5ff; margin: 16px 0;" />
            <p style="color: #6b7280; font-size: 12px;">BCE Event Manager — Powered by Supabase</p>
        </div>
    </div>
    """
    return await send_email(to, f"Registration Confirmed — {event_name}", html)


async def send_event_reminder(to: str, event_name: str, start_date: str, venue: str) -> bool:
    """Send event reminder notification."""
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #10b981); padding: 32px; border-radius: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">⏰ Event Reminder</h1>
        </div>
        <div style="padding: 24px; background: #f0fdf4; border-radius: 0 0 20px 20px;">
            <p><strong>{event_name}</strong> is starting soon!</p>
            <p>📅 Date: {start_date}</p>
            <p>📍 Venue: {venue}</p>
            <p>Don't forget to bring your QR code for check-in.</p>
        </div>
    </div>
    """
    return await send_email(to, f"Reminder — {event_name} is coming up!", html)


async def send_password_reset_notification(to: str) -> bool:
    """Send password reset notification."""
    html = """
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 32px; border-radius: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">🔑 Password Reset</h1>
        </div>
        <div style="padding: 24px; background: #fef3c7; border-radius: 0 0 20px 20px;">
            <p>A password reset has been initiated for your account.</p>
            <p>If you did not request this, please contact support immediately.</p>
        </div>
    </div>
    """
    return await send_email(to, "Password Reset Request — BCE Event Manager", html)
