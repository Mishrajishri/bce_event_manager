"""Waitlist management service for event registrations."""
from typing import Optional
from datetime import datetime, timezone
from app.supabase import supabase_admin
import json


def _get_atomic_position(event_id: str) -> int:
    """Get next waitlist position atomically using database function.
    
    This avoids race conditions by using a database transaction with locking.
    The RPC function uses SELECT FOR UPDATE to prevent race conditions.
    """
    # Use database function for atomic position - this is the primary method
    try:
        result = supabase_admin.rpc(
            "get_next_waitlist_position",
            {"event_uuid": event_id}
        ).execute()
        
        if result.data:
            return result.data
    except Exception as e:
        # Log error but fall through to fallback
        import logging
        logging.warning(f"RPC get_next_waitlist_position failed: {e}, using fallback")
    
    # Fallback: Use a more robust approach with retry logic
    # This is less atomic but safer than the original implementation
    import time
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Use a consistent read and calculate position
            result = supabase_admin.table("registrations")\
                .select("waitlist_position")\
                .eq("event_id", event_id)\
                .eq("status", "waitlisted")\
                .order("waitlist_position", desc=True)\
                .limit(1)\
                .execute()
            
            if result.data and result.data[0].get("waitlist_position"):
                return result.data[0]["waitlist_position"] + 1
            return 1
        except Exception:
            if attempt < max_retries - 1:
                time.sleep(0.1 * (attempt + 1))  # Exponential backoff
                continue
            raise
    return 1


class WaitlistService:
    """Handle waitlist logic for events.
    
    This service manages:
    - Adding users to waitlist when events are full
    - Promoting users from waitlist when spots open up
    - Reordering waitlist positions after promotions/cancellations
    - Tracking waitlist history for audit purposes
    """

    @staticmethod
    async def add_to_waitlist(
        event_id: str, 
        user_id: str, 
        registration_data: dict
    ) -> dict:
        """Add a user to the waitlist when an event is full.
        
        Args:
            event_id: The event UUID
            user_id: The user UUID
            registration_data: Additional registration fields
            
        Returns:
            The created registration record
        """
        # Use RPC function for atomic position - this avoids race conditions
        try:
            result = supabase_admin.rpc(
                "get_next_waitlist_position",
                {"event_uuid": event_id}
            ).execute()
            
            if result.data:
                waitlist_position = result.data
            else:
                waitlist_position = 1
        except Exception as e:
            # Fallback: Calculate position from current registrations
            import logging
            logging.warning(f"RPC get_next_waitlist_position failed: {e}, using fallback")
            
            result = supabase_admin.table("registrations")\
                .select("waitlist_position")\
                .eq("event_id", event_id)\
                .eq("status", "waitlisted")\
                .order("waitlist_position", desc=True)\
                .limit(1)\
                .execute()

            if result.data and result.data[0].get("waitlist_position"):
                waitlist_position = result.data[0]["waitlist_position"] + 1
            else:
                waitlist_position = 1

        # Create registration with waitlist status
        from uuid import uuid4
        registration = supabase_admin.table("registrations").insert({
            "id": str(uuid4()),
            "event_id": event_id,
            "user_id": user_id,
            "status": "waitlisted",
            "payment_status": "unpaid",
            "waitlist_position": waitlist_position,
            "waitlisted_at": datetime.now(timezone.utc).isoformat(),
            "registered_at": datetime.now(timezone.utc).isoformat(),
            **registration_data
        }).execute()

        # Log to history
        supabase_admin.table("waitlist_history").insert({
            "registration_id": registration.data[0]["id"],
            "action": "added",
            "new_position": waitlist_position
        }).execute()

        return registration.data[0]

    @staticmethod
    async def promote_from_waitlist(event_id: str) -> Optional[dict]:
        """Promote the first person from waitlist to confirmed.
        
        Args:
            event_id: The event UUID
            
        Returns:
            The promoted registration record, or None if waitlist is empty
        """
        # Get first person in waitlist
        result = supabase_admin.table("registrations")\
            .select("*")\
            .eq("event_id", event_id)\
            .eq("status", "waitlisted")\
            .order("waitlist_position")\
            .limit(1)\
            .execute()

        if not result.data:
            return None

        return await WaitlistService._promote_registration(event_id, result.data[0])

    @staticmethod
    async def promote_specific_user(event_id: str, user_id: str) -> Optional[dict]:
        """Promote a specific user from waitlist to confirmed.
        
        Args:
            event_id: The event UUID
            user_id: The user UUID to promote
            
        Returns:
            The promoted registration record, or None if user not found on waitlist
        """
        # Get the specific user's waitlist entry
        result = supabase_admin.table("registrations")\
            .select("*")\
            .eq("event_id", event_id)\
            .eq("user_id", user_id)\
            .eq("status", "waitlisted")\
            .single()\
            .execute()

        if not result.data:
            return None

        return await WaitlistService._promote_registration(event_id, result.data[0])

    @staticmethod
    async def _promote_registration(event_id: str, registration: dict) -> Optional[dict]:
        """Internal method to promote a registration and reorder waitlist.
        
        Args:
            event_id: The event UUID
            registration: The registration record to promote
            
        Returns:
            The promoted registration record
        """
        old_position = registration["waitlist_position"]

        # Promote to confirmed
        updated = supabase_admin.table("registrations")\
            .update({
                "status": "confirmed",
                "waitlist_position": None,
                "promoted_at": datetime.now(timezone.utc).isoformat()
            })\
            .eq("id", registration["id"])\
            .execute()

        # Log promotion
        supabase_admin.table("waitlist_history").insert({
            "registration_id": registration["id"],
            "action": "promoted",
            "old_position": old_position
        }).execute()

        # Reorder remaining waitlist
        await WaitlistService.reorder_waitlist(event_id)

        return updated.data[0]

    @staticmethod
    async def reorder_waitlist(event_id: str) -> None:
        """Reorder waitlist positions after promotion or removal.
        
        Ensures waitlist positions are always sequential (1, 2, 3...)
        without gaps. Uses bulk update for better atomicity.
        
        Args:
            event_id: The event UUID
        """
        # Get all waitlisted registrations ordered by waitlisted_at
        waitlisted = supabase_admin.table("registrations")\
            .select("id")\
            .eq("event_id", event_id)\
            .eq("status", "waitlisted")\
            .order("waitlisted_at")\
            .execute()

        if not waitlisted.data:
            return

        # Use RPC function if available, otherwise fall back to batch update
        try:
            # Try to use atomic reorder function
            supabase_admin.rpc(
                "reorder_waitlist_positions",
                {"event_uuid": event_id}
            ).execute()
        except Exception:
            # Fallback: Update positions in batch using a single query
            # Get IDs and generate new positions
            updates = [
                {"id": reg["id"], "waitlist_position": idx}
                for idx, reg in enumerate(waitlisted.data, 1)
            ]
            
            # Execute each update (not ideal but works)
            for update in updates:
                supabase_admin.table("registrations")\
                    .update({"waitlist_position": update["waitlist_position"]})\
                    .eq("id", update["id"])\
                    .execute()

    @staticmethod
    async def cancel_registration(registration_id: str) -> dict:
        """Cancel a registration and potentially promote from waitlist.
        
        If the cancelled registration was confirmed, automatically promotes
        the first person from the waitlist.
        
        Args:
            registration_id: The registration UUID to cancel
            
        Returns:
            The updated registration record
        """
        # Get registration details
        reg = supabase_admin.table("registrations")\
            .select("*, events(id, organizer_id)")\
            .eq("id", registration_id)\
            .single()\
            .execute()

        event_id = reg.data["event_id"]
        was_confirmed = reg.data["status"] == "confirmed"
        was_waitlisted = reg.data["status"] == "waitlisted"

        # Cancel the registration
        result = supabase_admin.table("registrations")\
            .update({"status": "cancelled"})\
            .eq("id", registration_id)\
            .execute()

        # Log cancellation
        if was_waitlisted:
            supabase_admin.table("waitlist_history").insert({
                "registration_id": registration_id,
                "action": "removed",
                "old_position": reg.data.get("waitlist_position")
            }).execute()

            # Reorder waitlist if cancelled from waitlist
            await WaitlistService.reorder_waitlist(event_id)

        # If it was a confirmed slot, promote someone from waitlist (if space available)
        if was_confirmed and not await WaitlistService.is_event_full(event_id):
            promoted = await WaitlistService.promote_from_waitlist(event_id)
            if promoted:
                # TODO: Trigger notification (Phase 2 - Notifications)
                pass

        return result.data[0]

    @staticmethod
    async def get_waitlist_position(event_id: str, user_id: str) -> Optional[int]:
        """Get a user's current waitlist position for an event.
        
        Args:
            event_id: The event UUID
            user_id: The user UUID
            
        Returns:
            The waitlist position (1-indexed), or None if not waitlisted
        """
        result = supabase_admin.table("registrations")\
            .select("waitlist_position")\
            .eq("event_id", event_id)\
            .eq("user_id", user_id)\
            .eq("status", "waitlisted")\
            .single()\
            .execute()

        return result.data["waitlist_position"] if result.data else None

    @staticmethod
    async def get_event_waitlist(event_id: str) -> list:
        """Get the full waitlist for an event.
        
        Args:
            event_id: The event UUID
            
        Returns:
            List of waitlisted registrations with user details
        """
        result = supabase_admin.table("registrations")\
            .select(
                "id, waitlist_position, waitlisted_at, "
                "users(id, first_name, last_name, email, phone)"
            )\
            .eq("event_id", event_id)\
            .eq("status", "waitlisted")\
            .order("waitlist_position")\
            .execute()

        return result.data

    @staticmethod
    async def manually_promote(event_id: str, organizer_id: str) -> Optional[dict]:
        """Manually promote first person from waitlist (organizer action).
        
        Args:
            event_id: The event UUID
            organizer_id: The organizer's user UUID
            
        Returns:
            The promoted registration, or None if waitlist is empty
        """
        # Verify organizer owns the event
        event = supabase_admin.table("events")\
            .select("organizer_id")\
            .eq("id", event_id)\
            .single()\
            .execute()

        if event.data["organizer_id"] != organizer_id:
            raise PermissionError("Not authorized to manage this event's waitlist")

        promoted = await WaitlistService.promote_from_waitlist(event_id)

        if promoted:
            # Log that this was a manual promotion
            supabase_admin.table("waitlist_history").insert({
                "registration_id": promoted["id"],
                "action": "promoted",
                "triggered_by": organizer_id,
                "notes": "Manually promoted by organizer"
            }).execute()

        return promoted

    @staticmethod
    async def is_event_full(event_id: str) -> bool:
        """Check if an event has reached capacity.
        
        Args:
            event_id: The event UUID
            
        Returns:
            True if event is at capacity, False otherwise
        """
        # Get event capacity
        event = supabase_admin.table("events")\
            .select("max_participants")\
            .eq("id", event_id)\
            .single()\
            .execute()

        max_participants = event.data.get("max_participants")

        if not max_participants:
            return False  # No limit

        # Count confirmed registrations
        result = supabase_admin.table("registrations")\
            .select("*", count="exact")\
            .eq("event_id", event_id)\
            .eq("status", "confirmed")\
            .execute()

        return result.count >= max_participants

    @staticmethod
    async def get_waitlist_stats(event_id: str) -> dict:
        """Get waitlist statistics for an event.
        
        Args:
            event_id: The event UUID
            
        Returns:
            Dict with waitlist count, max position, and avg wait time
        """
        result = supabase_admin.table("registrations")\
            .select("waitlist_position, waitlisted_at")\
            .eq("event_id", event_id)\
            .eq("status", "waitlisted")\
            .execute()

        if not result.data:
            return {
                "count": 0,
                "max_position": 0,
                "avg_wait_time_hours": 0
            }

        positions = [r["waitlist_position"] for r in result.data]
        wait_times = [
            (datetime.now(timezone.utc) - (
                datetime.fromisoformat(r["waitlisted_at"].replace('Z', '+00:00')) 
                if r["waitlisted_at"].endswith('Z') 
                else datetime.fromisoformat(r["waitlisted_at"])
            )).total_seconds() / 3600
            for r in result.data
        ]

        return {
            "count": len(result.data),
            "max_position": max(positions),
            "avg_wait_time_hours": sum(wait_times) / len(wait_times) if wait_times else 0
        }
