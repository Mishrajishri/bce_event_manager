"""Email Service - Resend integration for transactional emails."""
import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Try to import Resend, but don't fail if not installed
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend SDK not installed. Email sending will be simulated.")


class EmailService:
    """Email service using Resend for transactional emails."""
    
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY")
        self.from_email = os.getenv("EMAIL_FROM_ADDRESS", "noreply@bceevents.com")
        self.from_name = os.getenv("EMAIL_FROM_NAME", "BCE Events")
        
        if RESEND_AVAILABLE and self.api_key:
            resend.api_key = self.api_key
            logger.info("Resend email service initialized")
        else:
            logger.warning("Email service running in simulation mode")
    
    def _render_template(self, template: str, data: Dict[str, Any]) -> str:
        """Simple template variable replacement."""
        result = template
        for key, value in data.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send an email using Resend."""
        
        if not html_content and not text_content:
            raise ValueError("Either html_content or text_content must be provided")
        
        email_data = {
            "from": f"{from_name or self.from_name} <{from_email or self.from_email}>",
            "to": to_email,
            "subject": subject,
        }
        
        if html_content:
            email_data["html"] = html_content
        if text_content:
            email_data["text"] = text_content
        
        if RESEND_AVAILABLE and self.api_key:
            try:
                response = resend.Emails.send(email_data)
                logger.info(f"Email sent successfully to {to_email}")
                return {
                    "success": True,
                    "message_id": response.get("id"),
                    "provider": "resend"
                }
            except Exception as e:
                logger.error(f"Failed to send email: {str(e)}")
                return {
                    "success": False,
                    "error": str(e),
                    "provider": "resend"
                }
        else:
            # Simulation mode - just log
            logger.info(f"[SIMULATED] Email to {to_email}: {subject}")
            return {
                "success": True,
                "message_id": f"sim_{datetime.utcnow().timestamp()}",
                "provider": "simulation"
            }
    
    async def send_template_email(
        self,
        to_email: str,
        template_name: str,
        template_data: Dict[str, Any],
        subject_override: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send an email using a stored template."""
        from app.supabase import supabase_admin
        
        # Get template from database
        response = supabase_admin.table("email_templates").select("*").eq("name", template_name).execute()
        
        if not response.data:
            logger.warning(f"Template '{template_name}' not found")
            return {
                "success": False,
                "error": f"Template '{template_name}' not found"
            }
        
        template = response.data[0]
        
        # Render template
        subject = subject_override or self._render_template(template["subject"], template_data)
        html_content = self._render_template(template["body_html"], template_data) if template.get("body_html") else None
        text_content = self._render_template(template.get("body_text", ""), template_data)
        
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )
    
    async def send_bulk_emails(
        self,
        emails: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Send multiple emails in batch."""
        results = []
        
        for email in emails:
            result = await self.send_email(
                to_email=email["to"],
                subject=email["subject"],
                html_content=email.get("html"),
                text_content=email.get("text"),
            )
            results.append({
                "to": email["to"],
                **result
            })
        
        return results
    
    async def send_welcome_email(self, user_email: str, user_name: str) -> Dict[str, Any]:
        """Send welcome email to new users."""
        return await self.send_template_email(
            to_email=user_email,
            template_name="welcome",
            template_data={"name": user_name}
        )
    
    async def send_registration_confirmation(
        self,
        user_email: str,
        user_name: str,
        event_name: str,
        event_date: str,
        venue: str,
    ) -> Dict[str, Any]:
        """Send registration confirmation email."""
        return await self.send_template_email(
            to_email=user_email,
            template_name="registration_confirmation",
            template_data={
                "name": user_name,
                "event_name": event_name,
                "event_date": event_date,
                "venue": venue,
            }
        )
    
    async def send_event_reminder(
        self,
        user_email: str,
        user_name: str,
        event_name: str,
        event_date: str,
    ) -> Dict[str, Any]:
        """Send event reminder email."""
        return await self.send_template_email(
            to_email=user_email,
            template_name="event_reminder",
            template_data={
                "name": user_name,
                "event_name": event_name,
                "event_date": event_date,
            }
        )
    
    async def send_team_invite(
        self,
        user_email: str,
        user_name: str,
        team_name: str,
        event_name: str,
        message: str,
    ) -> Dict[str, Any]:
        """Send team invitation email."""
        return await self.send_template_email(
            to_email=user_email,
            template_name="team_invite",
            template_data={
                "name": user_name,
                "team_name": team_name,
                "event_name": event_name,
                "message": message,
            }
        )


# Singleton instance
email_service = EmailService()


# Queue processor for background email processing
class EmailQueueProcessor:
    """Process queued emails from the database."""
    
    def __init__(self):
        self.supabase = None
    
    def get_supabase(self):
        if not self.supabase:
            from app.supabase import supabase_admin
            self.supabase = supabase_admin
        return self.supabase
    
    async def process_queue(self, batch_size: int = 10) -> int:
        """Process pending emails in the queue."""
        supabase = self.get_supabase()
        
        # Get pending emails
        response = supabase.table("email_queue").select("*").eq("status", "pending").order("priority", desc=True).order("created_at", asc=True).limit(batch_size).execute()
        
        if not response.data:
            return 0
        
        processed = 0
        
        for email in response.data:
            try:
                # Update status to processing
                supabase.table("email_queue").update({"status": "processing"}).eq("id", email["id"]).execute()
                
                # Get template data if template_id exists
                template_data = email.get("template_data", {})
                if email.get("template_id"):
                    template_resp = supabase.table("email_templates").select("*").eq("id", email["template_id"]).execute()
                    if template_resp.data:
                        template = template_resp.data[0]
                        # Render template
                        subject = self._render_template(template.get("subject", ""), template_data)
                        body_html = self._render_template(template.get("body_html", ""), template_data)
                    else:
                        subject = email.get("subject", "")
                        body_html = email.get("body_html", "")
                else:
                    subject = email.get("subject", "")
                    body_html = email.get("body_html", "")
                
                # Send email
                result = await email_service.send_email(
                    to_email=email["to_email"],
                    subject=subject,
                    html_content=body_html,
                    from_email=email.get("from_email"),
                    from_name=email.get("from_name"),
                )
                
                if result.get("success"):
                    # Mark as sent
                    supabase.table("email_queue").update({
                        "status": "sent",
                        "sent_at": datetime.utcnow().isoformat(),
                    }).eq("id", email["id"]).execute()
                    
                    # Log to email_log
                    supabase.table("email_log").insert({
                        "message_id": result.get("message_id"),
                        "to_email": email["to_email"],
                        "subject": subject,
                        "status": "sent",
                    }).execute()
                else:
                    # Mark as failed
                    supabase.table("email_queue").update({
                        "status": "failed",
                        "failed_at": datetime.utcnow().isoformat(),
                        "error_message": result.get("error"),
                    }).eq("id", email["id"]).execute()
                
                processed += 1
                
            except Exception as e:
                logger.error(f"Error processing email {email['id']}: {str(e)}")
                supabase.table("email_queue").update({
                    "status": "failed",
                    "failed_at": datetime.utcnow().isoformat(),
                    "error_message": str(e),
                }).eq("id", email["id"]).execute()
        
        return processed
    
    def _render_template(self, template: str, data: Dict[str, Any]) -> str:
        """Simple template variable replacement."""
        result = template
        for key, value in data.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result


email_queue_processor = EmailQueueProcessor()
