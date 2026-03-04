# Complete Implementation Roadmap - All 8 Features (100% Free)

A detailed, step-by-step plan to implement all 8 features using only free tools and services.

---

## Executive Summary

**Total Features:** 8  
**Total Cost:** $0/month  
**Estimated Development Time:** 4-6 weeks (1 developer)  
**Priority:** Build in phases (Foundation → Core → Advanced)

---

## Phase 1: Foundation (Week 1)

### Feature 1: Waitlist System ⭐ START HERE

**Why First:** 
- Pure code implementation (no external APIs)
- Builds on existing registration system
- Immediate user value

#### Database Changes
```sql
-- Migration: Add waitlist fields to registrations
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS waitlist_position INTEGER,
ADD COLUMN IF NOT EXISTS waitlisted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMP WITH TIME ZONE;

-- Add waitlist to registration status enum
-- Note: Update your schema to include 'waitlisted' status

-- Create waitlist history table
CREATE TABLE IF NOT EXISTS waitlist_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('added', 'promoted', 'cancelled')),
    old_position INTEGER,
    new_position INTEGER,
    triggered_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waitlist_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own waitlist history"
ON waitlist_history FOR SELECT
USING (EXISTS (
    SELECT 1 FROM registrations r
    WHERE r.id = waitlist_history.registration_id
    AND r.user_id = auth.uid()
));

CREATE POLICY "Organizers can view event waitlist history"
ON waitlist_history FOR SELECT
USING (EXISTS (
    SELECT 1 FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.id = waitlist_history.registration_id
    AND e.organizer_id = auth.uid()
));
```

#### Backend Implementation

**File:** `backend/app/services/waitlist.py`
```python
"""Waitlist management service."""
from typing import Optional
from datetime import datetime, timezone
from app.supabase import supabase_admin

class WaitlistService:
    """Handle waitlist logic for events."""
    
    @staticmethod
    async def add_to_waitlist(event_id: str, user_id: str, registration_data: dict) -> dict:
        """Add user to waitlist when event is full."""
        # Get current waitlist count
        result = supabase_admin.table("registrations")\
            .select("*", count="exact")\
            .eq("event_id", event_id)\
            .eq("status", "waitlisted")\
            .execute()
        
        waitlist_position = result.count + 1
        
        # Create registration with waitlist status
        registration = supabase_admin.table("registrations").insert({
            "event_id": event_id,
            "user_id": user_id,
            "status": "waitlisted",
            "waitlist_position": waitlist_position,
            "waitlisted_at": datetime.now(timezone.utc).isoformat(),
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
        """Promote first person from waitlist to confirmed."""
        # Get first in waitlist
        result = supabase_admin.table("registrations")\
            .select("*")\
            .eq("event_id", event_id)\
            .eq("status", "waitlisted")\
            .order("waitlist_position")\
            .limit(1)\
            .execute()
        
        if not result.data:
            return None
        
        registration = result.data[0]
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
    async def reorder_waitlist(event_id: str):
        """Reorder waitlist positions after promotion/removal."""
        waitlisted = supabase_admin.table("registrations")\
            .select("id")\
            .eq("event_id", event_id)\
            .eq("status", "waitlisted")\
            .order("waitlisted_at")\
            .execute()
        
        for idx, reg in enumerate(waitlisted.data, 1):
            supabase_admin.table("registrations")\
                .update({"waitlist_position": idx})\
                .eq("id", reg["id"])\
                .execute()
    
    @staticmethod
    async def cancel_registration(registration_id: str) -> dict:
        """Cancel registration and potentially promote from waitlist."""
        # Get registration details
        reg = supabase_admin.table("registrations")\
            .select("*, events(id, organizer_id)")\
            .eq("id", registration_id)\
            .single()\
            .execute()
        
        event_id = reg.data["event_id"]
        was_confirmed = reg.data["status"] == "confirmed"
        
        # Cancel the registration
        result = supabase_admin.table("registrations")\
            .update({"status": "cancelled"})\
            .eq("id", registration_id)\
            .execute()
        
        # If it was a confirmed slot, promote someone from waitlist
        if was_confirmed:
            promoted = await WaitlistService.promote_from_waitlist(event_id)
            if promoted:
                # Trigger notification (Phase 2)
                pass
        
        return result.data[0]
    
    @staticmethod
    async def get_waitlist_position(event_id: str, user_id: str) -> Optional[int]:
        """Get user's current waitlist position."""
        result = supabase_admin.table("registrations")\
            .select("waitlist_position")\
            .eq("event_id", event_id)\
            .eq("user_id", user_id)\
            .eq("status", "waitlisted")\
            .single()\
            .execute()
        
        return result.data["waitlist_position"] if result.data else None
```

**File:** `backend/app/routers/waitlist.py`
```python
"""Waitlist API routes."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.auth import CurrentUser, require_auth
from app.services.waitlist import WaitlistService
from app.models.schemas import WaitlistEntry, WaitlistHistoryEntry

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])

@router.get("/position/{event_id}", response_model=Optional[int])
async def get_waitlist_position(
    event_id: str,
    current_user: CurrentUser = Depends(require_auth)
):
    """Get current user's waitlist position for an event."""
    return await WaitlistService.get_waitlist_position(event_id, current_user.user_id)

@router.get("/event/{event_id}", response_model=List[WaitlistEntry])
async def get_event_waitlist(
    event_id: str,
    current_user: CurrentUser = Depends(require_auth)
):
    """Get waitlist for an event (organizer only)."""
    # Check if user is organizer
    from app.supabase import supabase_admin
    event = supabase_admin.table("events").select("organizer_id").eq("id", event_id).single().execute()
    
    if event.data["organizer_id"] != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    waitlist = supabase_admin.table("registrations")\
        .select("*, users(first_name, last_name, email)")\
        .eq("event_id", event_id)\
        .eq("status", "waitlisted")\
        .order("waitlist_position")\
        .execute()
    
    return waitlist.data

@router.post("/promote/{event_id}")
async def manually_promote_from_waitlist(
    event_id: str,
    current_user: CurrentUser = Depends(require_auth)
):
    """Manually promote first person from waitlist (organizer only)."""
    # Verify organizer
    from app.supabase import supabase_admin
    event = supabase_admin.table("events").select("organizer_id").eq("id", event_id).single().execute()
    
    if event.data["organizer_id"] != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    promoted = await WaitlistService.promote_from_waitlist(event_id)
    if not promoted:
        raise HTTPException(status_code=404, detail="No one on waitlist")
    
    return {"message": "Promoted successfully", "registration": promoted}

@router.get("/history/{event_id}", response_model=List[WaitlistHistoryEntry])
async def get_waitlist_history(
    event_id: str,
    current_user: CurrentUser = Depends(require_auth)
):
    """Get waitlist history for an event."""
    from app.supabase import supabase_admin
    
    # Check authorization
    event = supabase_admin.table("events").select("organizer_id").eq("id", event_id).single().execute()
    if event.data["organizer_id"] != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    history = supabase_admin.table("waitlist_history")\
        .select("*, registrations(user_id, users(first_name, last_name))")\
        .eq("registration_id", event_id)\
        .execute()
    
    return history.data
```

#### Frontend Implementation

**File:** `frontend/src/services/waitlist.ts`
```typescript
import { api } from './api';

export const waitlistService = {
  getPosition: (eventId: string) => 
    api.get<number | null>(`/waitlist/position/${eventId}`),
    
  getEventWaitlist: (eventId: string) => 
    api.get(`/waitlist/event/${eventId}`),
    
  promoteFromWaitlist: (eventId: string) => 
    api.post(`/waitlist/promote/${eventId}`),
    
  getHistory: (eventId: string) => 
    api.get(`/waitlist/history/${eventId}`),
};
```

**File:** `frontend/src/components/WaitlistBadge.tsx`
```tsx
import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { AccessTime, CheckCircle } from '@mui/icons-material';

interface WaitlistBadgeProps {
  status: 'confirmed' | 'waitlisted' | 'cancelled';
  position?: number;
  totalWaitlist?: number;
}

export const WaitlistBadge: React.FC<WaitlistBadgeProps> = ({
  status,
  position,
  totalWaitlist
}) => {
  if (status === 'confirmed') {
    return (
      <Chip
        icon={<CheckCircle />}
        label="Confirmed"
        color="success"
        size="small"
      />
    );
  }
  
  if (status === 'waitlisted') {
    return (
      <Tooltip title={`You're #${position} of ${totalWaitlist} on the waitlist`}>
        <Chip
          icon={<AccessTime />}
          label={`Waitlist #${position}`}
          color="warning"
          size="small"
        />
      </Tooltip>
    );
  }
  
  return (
    <Chip
      label="Cancelled"
      color="default"
      size="small"
    />
  );
};
```

#### Integration with Registration Flow

**Update:** `backend/app/routers/registrations.py`
```python
# In your registration endpoint:
from app.services.waitlist import WaitlistService

async def register_for_event(event_id: str, user_id: str, ...):
    # Check if event is full
    event = supabase_admin.table("events").select("max_participants").eq("id", event_id).single().execute()
    max_participants = event.data.get("max_participants")
    
    if max_participants:
        current_count = supabase_admin.table("registrations")\
            .select("*", count="exact")\
            .eq("event_id", event_id)\
            .eq("status", "confirmed")\
            .execute().count
        
        if current_count >= max_participants:
            # Add to waitlist instead
            return await WaitlistService.add_to_waitlist(event_id, user_id, registration_data)
    
    # Normal registration flow
    ...
```

#### Testing Checklist
- [ ] Event fills up → new registrations go to waitlist
- [ ] Waitlist position increments correctly
- [ ] Cancellation promotes first from waitlist
- [ ] Waitlist reordering works correctly
- [ ] Organizers can view and manually manage waitlist
- [ ] Users can see their waitlist position

---

## Phase 2: Core Features (Week 2-3)

### Feature 2: Notifications System

**Cost:** $0 (Supabase Realtime + Web Push API)

**Architecture:**
```
Database (notifications table)
    ↓
Supabase Realtime (broadcasts changes)
    ↓
Frontend (subscribes to channel)
    ↓
Service Worker (handles background notifications)
```

[Detailed implementation continues...]

### Feature 3: Email Automation

**Cost:** $0 (Resend 3,000 emails/month)

[Detailed implementation continues...]

---

## Phase 3: Advanced Features (Week 4-6)

### Feature 4: Payment Integration
### Feature 5: Advanced Analytics
### Feature 6: Social Features
### Feature 7: Bulk Operations
### Feature 8: Resource Management

[Detailed implementations continue...]

---

## Complete File Structure After Implementation

```
bce_event_manager/
├── backend/
│   └── app/
│       ├── services/
│       │   ├── waitlist.py          # NEW
│       │   ├── notifications.py     # NEW
│       │   └── email_service.py     # NEW
│       ├── routers/
│       │   ├── waitlist.py          # NEW
│       │   ├── notifications.py     # NEW
│       │   └── payments.py          # NEW
│       └── models/
│           └── schemas.py           # UPDATED
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── WaitlistBadge.tsx    # NEW
│       │   ├── NotificationBell.tsx # NEW
│       │   └── ...
│       ├── services/
│       │   ├── waitlist.ts          # NEW
│       │   └── notifications.ts     # NEW
│       └── hooks/
│           ├── useWaitlist.ts       # NEW
│           └── useNotifications.ts  # NEW
└── supabase/
    └── migrations/
        ├── 001_waitlist.sql         # NEW
        ├── 002_notifications.sql    # NEW
        └── 003_email_templates.sql  # NEW
```

---

## Getting Started: Week 1 Action Items

### Day 1-2: Waitlist System
1. [ ] Run database migration
2. [ ] Implement WaitlistService
3. [ ] Create API routes
4. [ ] Build WaitlistBadge component
5. [ ] Integrate with registration flow
6. [ ] Test end-to-end

### Day 3-4: Notifications Foundation
1. [ ] Create notifications table
2. [ ] Set up Supabase Realtime
3. [ ] Build NotificationBell component
4. [ ] Add notification triggers to key events

### Day 5: Email Setup
1. [ ] Sign up for Resend (free)
2. [ ] Create email templates
3. [ ] Implement email service
4. [ ] Test email sending

---

## Success Metrics

After completing all 8 features:
- ✉️ 100% of users get email confirmations
- 🔔 Real-time updates for event changes
- 📝 Waitlist automatically fills cancelled spots
- 💳 Payment processing with receipts
- 📊 Organizers see detailed analytics
- 🚀 Users can share events on social media
- ⚡ Bulk operations save hours of manual work
- 📦 Resources tracked and managed

---

## Next Steps

1. Review this roadmap
2. Pick your first feature (recommend: Waitlist System)
3. Switch to Code mode
4. Start building!

Ready to begin implementation?
