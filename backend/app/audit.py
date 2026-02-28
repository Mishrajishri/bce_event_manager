"""Audit logging helper for tracking admin actions."""
from typing import Optional
from app.supabase import supabase_admin
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


async def log_audit(
    actor_id: str,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    changes: Optional[dict] = None,
) -> None:
    """
    Record an audit log entry.

    Args:
        actor_id: ID of the user performing the action
        action: Description of the action (e.g. "update_role", "delete_user")
        target_type: Type of the target entity (e.g. "user", "event")
        target_id: ID of the target entity
        changes: JSON-serializable dict describing what changed
    """
    try:
        supabase_admin.table("audit_logs").insert({
            "actor_id": actor_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "changes": changes or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        # Audit logging should never break the main flow
        logger.error(f"Failed to write audit log: {e}")
