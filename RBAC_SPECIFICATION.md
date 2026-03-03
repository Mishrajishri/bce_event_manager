# Role-Based Access Control (RBAC) Specification
## BCE Event Manager - Bansal College of Engineering

**Version:** 2.0  
**Last Updated:** March 2026  
**Status:** Implementation Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Role Hierarchy](#role-hierarchy)
3. [Detailed Role Definitions](#detailed-role-definitions)
   - Super Admin (God Mode)
   - Event Organizer
   - Logistics & Supply Manager
   - Field Volunteer
   - Team Leader
   - Participant/Player
   - General Viewer (Spectator)
4. [Access Control Matrix](#access-control-matrix)
5. [Technical Implementation](#technical-implementation)
6. [Super Admin "God Mode" Deep Dive](#super-admin-god-mode-deep-dive)
7. [Security & Audit Trail](#security--audit-trail)
8. [Database Schema](#database-schema)
9. [API Middleware Implementation](#api-middleware-implementation)
10. [Frontend Route Guards](#frontend-route-guards)

---

## Overview

The BCE Event Manager implements a robust Role-Based Access Control (RBAC) system designed for the multi-departmental, multi-event environment of Bansal College of Engineering (BCE) under RGPV. This system ensures proper authorization boundaries while providing flexibility for event management across technical, cultural, and sports domains.

### Key Principles

1. **Principle of Least Privilege**: Users receive only the permissions necessary for their role
2. **Separation of Duties**: Critical operations require distinct roles (e.g., Organizers manage events, Volunteers execute them)
3. **Hierarchical Access**: Super Admin > Organizer > Team Operations > Participants > Spectators
4. **Auditability**: All privileged actions are logged with user identification and timestamps

---

## Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPER ADMIN                            │
│                    (God Mode - Faculty)                     │
│         Absolute Control | System Override | Audit          │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    EVENT      │    │   LOGISTICS   │    │    SYSTEM     │
│   ORGANIZER   │    │    MANAGER    │    │   VIEW ONLY   │
│               │    │               │    │               │
│ Event-specific│    │ Asset Mgmt    │    │ Analytics     │
│ Full Control  │    │ Inventory     │    │ Reports       │
└───────┬───────┘    └───────┬───────┘    └───────────────┘
        │                     │
        ▼                     ▼
┌───────────────┐    ┌───────────────┐
│ FIELD VOLUNTEER│   │ TEAM LEADER   │
│               │    │               │
│ Live Scoring  │    │ Team Mgmt     │
│ Check-in Tool │    │ Document Up   │
└───────────────┘    └───────┬───────┘
                             │
                             ▼
                    ┌───────────────┐
                    │  PARTICIPANT  │
                    │               │
                    │ Register      │
                    │ View History  │
                    └───────────────┘
                             │
                             ▼
                    ┌───────────────┐
                    │    SPECTATOR  │
                    │               │
                    │ View Public   │
                    │ No Login Req  │
                    └───────────────┘
```

---

## Detailed Role Definitions

### 1. Super Admin (System/College Level) - "God Mode"

**Identity:** Faculty-in-Charge, Technical Head of Portal, Department HOD

#### Core Responsibilities
- Oversee ALL events across departments (CSE, EX, ME, CE, EC, etc.)
- Platform governance and policy enforcement
- Database integrity and system maintenance
- Emergency intervention and conflict resolution

#### Standard Access Rights
| Feature | Access Level |
|---------|-------------|
| Create Event | ✅ Yes (Any Department) |
| Delete Event | ✅ Yes (Any Event) |
| Edit Event Details | ✅ Yes (Override) |
| Approve/Reject Event Requests | ✅ Yes |
| Manage Master User List | ✅ Yes |
| View Analytics | ✅ Yes (All Events) |
| View Budget Reports | ✅ Yes (All Events) |

#### "God Mode" Special Privileges

##### 1.1 Database & Structural Control
- **Direct Entry Manipulation**: Edit, delete, or hard-reset any data entry without approval workflow
  - Scores can be modified post-finalization
  - Team compositions can be force-changed
  - Participant lists can be manually adjusted
  
- **Schema Overrides**: Bypass all validation logic
  - Example: Force a hackathon team to have 10 members despite 5-member limit
  - Example: Allow single-member "team" where teams are required
  - Example: Override registration deadline locks

- **Archive/Restore**: 
  - "Undelete" accidentally removed events
  - Restore deleted user accounts
  - Recover purged registration data

##### 1.2 Financial & Resource Oversight
- **Budget Overruling**: 
  - Override expense limits set by Organizers
  - Approve "unauthorized" expenses
  - Modify approved budgets retroactively
  
- **Vendor Blacklisting**:
  - Globally ban suppliers from all future events
  - Add vendors to approved/preferred list
  - Override vendor assignments

##### 1.3 User & Identity Management
- **Role Promotion/Demotion**:
  - Instantly convert Participant → Organizer
  - Strip any user of their powers
  - Grant temporary elevated permissions

- **"Act As" (Impersonation)**:
  - Log in as any user role to debug issues
  - View exactly what Volunteers/Team Leaders see
  - Test features from different role perspectives
  - **Audit Note**: All impersonation actions are heavily logged

- **Global Ban Hammer**:
  - Block students by Enrollment Number (e.g., 0103CS221012)
  - Ban from specific event categories
  - Permanent or time-limited suspension

##### 1.4 Content & Communication Control
- **Global Broadcast**: Send notifications to ALL platform users
- **Gallery Censorship**: Remove any uploaded photos/scores immediately
- **System Maintenance Mode**: Lock entire website for maintenance
  - Only Super Admins can access during maintenance
  - Custom maintenance messages
  - Gradual rollout capability

##### 1.5 Bypass Authority Logic
```python
# Core Override Principle
if user.has_role("SUPER_ADMIN"):
    access = GRANTED  # Skip all permission checks
    log_action(user, action, "SUPER_ADMIN_OVERRIDE")
else:
    access = check_standard_permissions(user, action)
```

---

### 2. Event Organizer (The "Event Head")

**Identity:** Hackathon Head, Sports Coordinator, Cultural Event Lead, Technical Event Coordinator

#### Core Responsibilities
- Design event flow and structure
- Set dates, venues, and rules
- Manage event budget
- Coordinate with Logistics and Volunteers

#### Access Rights

| Feature | Access Level | Notes |
|---------|-------------|-------|
| Create Event | ✅ Yes | Within their department/scope |
| Edit Event Details | ✅ Yes | Rules, Time, Venue, Description |
| Delete Event | ❌ No | Must request Super Admin |
| Assign Sub-Roles | ✅ Yes | Can assign Volunteers, Logistics |
| Export Participants | ✅ Yes | Excel, PDF formats |
| Send Mass Notifications | ✅ Yes | Email/SMS to participants |
| Edit Scores | ✅ Limited | During event, not post-finalization |
| View Analytics | ✅ Yes | Event-specific only |
| Manage Budget | ✅ Yes | Within allocated limits |
| Approve Expenses | ✅ Yes | Up to threshold amount |

#### Scope Limitations
- Can only manage events they are assigned to
- Cannot access other organizers' events without explicit permission
- Budget modifications require Super Admin approval if exceeding limits

---

### 3. Logistics & Supply Manager

**Identity:** Equipment Coordinator, Procurement Officer, Inventory Manager

#### Core Responsibilities
- Manage physical assets and inventory
- Coordinate with vendors and suppliers
- Track equipment issuance and returns

#### Access Rights

| Feature | Access Level | Notes |
|---------|-------------|-------|
| Inventory Dashboard | ✅ Full | Mark items "Issued" or "Returned" |
| Vendor Portal | ✅ Full | Update supply status |
| View Event Schedule | ✅ View-Only | Cannot modify |
| Request Equipment | ✅ Yes | For assigned events |
| Budget Access | ❌ No | Cannot view financial details |
| Score Management | ❌ No | No access to scoring |
| Participant Data | ❌ No | Cannot export lists |

#### Example Workflows
- Cricket tournament: "Bat issued to Team A" → Mark in system → Return check-in
- Hackathon: "LAN cables arrived from Vendor X" → Update vendor portal → Mark available

---

### 4. Field Volunteer (The "Live Updater")

**Identity:** Event Volunteers, Scorekeepers, Entry/Exit Gate Staff

#### Core Responsibilities
- Real-time data entry
- Crowd management and check-ins
- Live score updates

#### Access Rights

| Feature | Access Level | Notes |
|---------|-------------|-------|
| Live Scoring Interface | ✅ Yes | Simplified UI for scores |
| Check-in Tool | ✅ Yes | QR scanner or manual search |
| Mark Attendance | ✅ Yes | At entry gates |
| Financial Access | ❌ No | No budget/inventory access |
| Backend Settings | ❌ No | Cannot modify event structure |
| Participant Contact | ❌ No | Limited contact info view |

#### Interface Features
- **Scorekeeper Page**: Large buttons, minimal inputs, quick actions
- **Scanner Page**: QR code scanning with camera or manual entry fallback
- **Real-time Updates**: Changes reflect immediately on public scoreboards

---

### 5. Team Leader (Student Representative)

**Identity:** Cricket Team Captain, Hackathon Team Lead, Group Project Leader

#### Core Responsibilities
- Register the team for events
- Ensure team members follow rules
- Upload required documentation

#### Access Rights

| Feature | Access Level | Notes |
|---------|-------------|-------|
| Team Management | ✅ Yes | Add/Remove teammates |
| Document Upload | ✅ Yes | Student IDs, NOCs for whole team |
| View Schedule | ✅ Personalized | Only their matches/events |
| Edit Event Details | ❌ No | Cannot modify event |
| Manage Inventory | ❌ No | No equipment access |
| Financial Data | ❌ No | No budget view |

#### Team Management Limits
- Must stay within event-defined team size limits (unless Super Admin overrides)
- Can only manage teams they are designated leader of
- Cannot remove themselves (must transfer leadership first)

---

### 6. Participant / Player

**Identity:** Individual students competing in events

#### Core Responsibilities
- Register for events
- Attend events on time
- Follow event rules and guidelines

#### Access Rights

| Feature | Access Level | Notes |
|---------|-------------|-------|
| Event Registration | ✅ Yes | Subject to eligibility and deadlines |
| Download Certificates | ✅ Yes | Participation/Winning certificates |
| View Event History | ✅ Yes | Past and upcoming events |
| Join Teams | ✅ Yes | Via invite or application |
| Submit Feedback | ✅ Yes | Post-event surveys |
| Edit Event | ❌ No | Read-only access |
| View Others' Data | ❌ No | Privacy protected |

---

### 7. General Viewer (The Spectator)

**Identity:** Other students, faculty, parents, external visitors

#### Core Responsibilities
- Follow events as audience
- View public information

#### Access Rights (No Login Required for Most)

| Feature | Access Level | Notes |
|---------|-------------|-------|
| View Live Scoreboards | ✅ Yes | Public-facing, no login |
| View Gallery/Photos | ✅ Yes | Public photos only |
| Event Schedule | ✅ Yes | Public calendar view |
| Event Details | ✅ Yes | Basic information |
| Registration | ❌ No | Requires login as Participant |
| Private Data | ❌ No | No access to participant info |

---

## Access Control Matrix

### Feature Permission Matrix

| Feature | Super Admin | Organizer | Logistics | Volunteer | Team Leader | Participant | Spectator |
|---------|:-----------:|:---------:|:---------:|:---------:|:-----------:|:-----------:|:---------:|
| **Event Management** |
| Create Event | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit Any Event | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit Own Event | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete Event | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Scoring & Results** |
| Edit Scores (Live) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Edit Scores (Post-Game) | ✅ | Limited | ❌ | ❌ | ❌ | ❌ | ❌ |
| Finalize Results | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Live Scoreboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **User Management** |
| Create Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete User Accounts | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Promote/Demote Roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Impersonate Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Team Management** |
| Create Teams | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Edit Any Team | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit Own Team | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Add/Remove Teammates | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Inventory & Logistics** |
| Manage Inventory | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update Vendor Status | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Issue Equipment | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Check-in & Attendance** |
| QR Check-in Scan | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Mark Attendance | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Attendance Reports | ✅ | ✅ | ❌ | ❌ | Limited | Own only | ❌ |
| **Communication** |
| Global Broadcast | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Event Notifications | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Send to Participants | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Documentation** |
| Upload Documents | ✅ | ✅ | ❌ | ❌ | ✅ | Limited | ❌ |
| Export Participant List | ✅ | ✅ | ❌ | ❌ | ❌ | Own only | ❌ |
| Generate Certificates | ✅ | ✅ | ❌ | ❌ | ❌ | Own only | ❌ |
| **Analytics & Reports** |
| View Analytics | ✅ | Event only | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Budget Reports | ✅ | Event only | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export Reports | ✅ | Event only | ❌ | ❌ | ❌ | ❌ | ❌ |
| **System Administration** |
| Change System Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Maintenance Mode | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Override Any Rule | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Technical Implementation

### Backend Role Checking

```python
# app/auth.py
from enum import Enum
from functools import wraps
from fastapi import HTTPException, Depends

class UserRole(str, Enum):
    SPECTATOR = "spectator"           # No login
    PARTICIPANT = "participant"       # Basic user
    TEAM_LEADER = "team_leader"       # Team captain
    VOLUNTEER = "volunteer"           # Field volunteer
    LOGISTICS = "logistics"           # Supply manager
    ORGANIZER = "organizer"           # Event head
    SUPER_ADMIN = "super_admin"       # God mode

# Role hierarchy for inheritance (higher = more permissions)
ROLE_HIERARCHY = {
    UserRole.SPECTATOR: 0,
    UserRole.PARTICIPANT: 1,
    UserRole.TEAM_LEADER: 2,
    UserRole.VOLUNTEER: 3,
    UserRole.LOGISTICS: 4,
    UserRole.ORGANIZER: 5,
    UserRole.SUPER_ADMIN: 99  # Absolute
}

def require_role(min_role: UserRole):
    """Decorator to require minimum role level"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            # Super Admin bypass
            if current_user.role == UserRole.SUPER_ADMIN:
                log_super_admin_action(current_user.id, func.__name__)
                return await func(*args, current_user=current_user, **kwargs)
            
            # Standard permission check
            user_level = ROLE_HIERARCHY.get(current_user.role, 0)
            required_level = ROLE_HIERARCHY.get(min_role, 0)
            
            if user_level < required_level:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied. Required role: {min_role.value}"
                )
            
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# Specific role requirements
require_organizer = require_role(UserRole.ORGANIZER)
require_volunteer = require_role(UserRole.VOLUNTEER)
require_team_leader = require_role(UserRole.TEAM_LEADER)
require_super_admin = require_role(UserRole.SUPER_ADMIN)
```

### Super Admin Override Middleware

```python
# app/middleware/super_admin.py

class SuperAdminMiddleware:
    """
    Middleware that logs all Super Admin actions
    and adds override capability
    """
    
    async def dispatch(self, request: Request, call_next):
        user = request.state.user
        
        if user and user.role == UserRole.SUPER_ADMIN:
            # Add override header for downstream use
            request.state.is_super_admin = True
            request.state.override_mode = request.headers.get("X-Override-Mode", False)
            
            # Log the privileged access
            await audit_log.log({
                "user_id": user.id,
                "role": "SUPER_ADMIN",
                "action": request.method,
                "path": request.url.path,
                "timestamp": datetime.utcnow(),
                "ip": request.client.host
            })
        
        response = await call_next(request)
        return response
```

### Permission Decorator Examples

```python
# app/permissions.py

def can_edit_event(event_id: str):
    """Check if user can edit specific event"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            # Super Admin can edit any event
            if current_user.role == UserRole.SUPER_ADMIN:
                return await func(*args, current_user=current_user, **kwargs)
            
            # Check if user is organizer of this event
            event = await get_event(event_id)
            if event.organizer_id != current_user.id:
                raise HTTPException(403, "Not authorized to edit this event")
            
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

def can_edit_scores(event_id: str, match_state: str = "live"):
    """Score editing permission with state awareness"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            # Super Admin can edit anytime
            if current_user.role == UserRole.SUPER_ADMIN:
                return await func(*args, current_user=current_user, **kwargs)
            
            # Organizers can edit during event
            if current_user.role == UserRole.ORGANIZER:
                if match_state == "finalized":
                    raise HTTPException(403, "Cannot edit finalized scores")
                return await func(*args, current_user=current_user, **kwargs)
            
            # Volunteers can only edit live scores
            if current_user.role == UserRole.VOLUNTEER:
                if match_state != "live":
                    raise HTTPException(403, "Volunteers can only edit live scores")
                return await func(*args, current_user=current_user, **kwargs)
            
            raise HTTPException(403, "Not authorized to edit scores")
        return wrapper
    return decorator
```

---

## Super Admin "God Mode" Deep Dive

### Impersonation Feature

```python
# app/routers/admin.py

@router.post("/admin/impersonate/{user_id}")
@require_super_admin
async def impersonate_user(
    user_id: str,
    reason: str,  # Required justification
    current_user: User = Depends(get_current_user)
):
    """
    Super Admin can "log in" as another user to debug issues
    """
    # Log impersonation attempt
    await audit_log.log({
        "action": "IMPERSONATION_START",
        "super_admin_id": current_user.id,
        "target_user_id": user_id,
        "reason": reason,
        "timestamp": datetime.utcnow()
    })
    
    target_user = await get_user(user_id)
    
    # Create temporary session token with impersonation flag
    token = create_access_token(
        user_id=target_user.id,
        original_admin_id=current_user.id,
        is_impersonation=True,
        expires_delta=timedelta(hours=1)  # Limited time
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "impersonating": target_user.email,
        "original_admin": current_user.email,
        "expires_in": "1 hour"
    }

@router.post("/admin/stop-impersonation")
async def stop_impersonation(current_user: User = Depends(get_current_user)):
    """Return to Super Admin session"""
    if not current_user.is_impersonating:
        raise HTTPException(400, "Not in impersonation mode")
    
    # Log end of impersonation
    await audit_log.log({
        "action": "IMPERSONATION_END",
        "super_admin_id": current_user.original_admin_id,
        "timestamp": datetime.utcnow()
    })
    
    # Re-create original admin token
    admin_user = await get_user(current_user.original_admin_id)
    token = create_access_token(admin_user.id)
    
    return {"access_token": token, "message": "Returned to admin session"}
```

### Global Ban System

```python
# app/models/schemas.py

class GlobalBan(BaseModel):
    id: str
    enrollment_number: str  # RGPV format: 0103CS221012
    banned_by: str  # Super Admin ID
    reason: str
    ban_type: str  # "ALL_EVENTS", "SPECIFIC_EVENT", "CATEGORY"
    event_id: Optional[str]
    category: Optional[str]
    banned_at: datetime
    expires_at: Optional[datetime]  # NULL = permanent
    is_active: bool = True

# Usage in registration
@router.post("/events/{event_id}/register")
async def register_for_event(
    event_id: str,
    current_user: User = Depends(get_current_user)
):
    # Check global ban
    ban = await check_global_ban(current_user.enrollment_number)
    if ban and ban.is_active:
        if ban.ban_type == "ALL_EVENTS" or \
           (ban.ban_type == "SPECIFIC_EVENT" and ban.event_id == event_id):
            raise HTTPException(403, f"You are banned from registering: {ban.reason}")
    
    # Continue with registration...
```

### Maintenance Mode

```python
# app/middleware/maintenance.py

class MaintenanceModeMiddleware:
    async def dispatch(self, request: Request, call_next):
        # Check if maintenance mode is active
        is_maintenance = await redis.get("system:maintenance_mode")
        
        if is_maintenance:
            # Allow Super Admins through
            user = request.state.user
            if user and user.role == UserRole.SUPER_ADMIN:
                response = await call_next(request)
                response.headers["X-Maintenance-Mode"] = "true"
                return response
            
            # Block everyone else
            return JSONResponse(
                status_code=503,
                content={
                    "message": "System is under maintenance",
                    "retry_after": 3600
                }
            )
        
        return await call_next(request)

# Admin endpoint to toggle maintenance
@router.post("/admin/maintenance-mode")
@require_super_admin
async def toggle_maintenance(
    enable: bool,
    message: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if enable:
        await redis.set("system:maintenance_mode", "true", ex=86400)
        await redis.set("system:maintenance_message", message or "System maintenance in progress")
        
        # Notify all connected users
        await socket_manager.broadcast({
            "type": "MAINTENANCE_NOTICE",
            "message": message,
            "disconnect_in": 300  # 5 minutes warning
        })
    else:
        await redis.delete("system:maintenance_mode")
        await redis.delete("system:maintenance_message")
    
    return {"maintenance_mode": enable}
```

---

## Activity Log / Audit Trail System

### Overview

The Activity Log provides an immutable, tamper-proof "Paper Trail" of every significant action performed on the platform. This ensures accountability, enables forensic investigation, and allows authorized rollback of erroneous changes.

**Golden Rule:** *Audit logs are IMMUTABLE. Even Super Admins cannot delete or modify history entries.*

---

### 1. Data Structure (Log Entry Schema)

Every log entry captures comprehensive context about the action:

```typescript
interface AuditLogEntry {
  // Identity
  id: string;                    // UUID v4
  timestamp: string;             // ISO 8601 with milliseconds
  actor: {
    user_id: string;
    name: string;
    enrollment_number: string;   // RGPV format: 0103CS221012
    role: UserRole;
    ip_address: string;
    user_agent: string;
    session_id: string;
  };
  
  // Action Classification
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 
               'OVERRIDE' | 'EXPORT' | 'BULK_ACTION' | 'IMPERSONATION_START' | 
               'IMPERSONATION_END' | 'ROLLBACK' | 'PERMISSION_CHANGE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  
  // Target
  target: {
    resource_type: 'EVENT' | 'TEAM' | 'MATCH' | 'SCORE' | 'USER' | 
                   'REGISTRATION' | 'EXPENSE' | 'INVENTORY' | 'ANNOUNCEMENT' | 
                   'CERTIFICATE' | 'SYSTEM_SETTING';
    resource_id: string;
    resource_name: string;       // Human-readable identifier
  };
  
  // The "Delta" - Before vs After (Crucial for rollbacks)
  delta: {
    old_value: any | null;       // Complete previous state (JSON)
    new_value: any | null;       // Complete new state (JSON)
    changed_fields: string[];    // Array of field names that changed
  };
  
  // Context
  context: {
    event_id?: string;           // If action was within an event
    department?: string;         // EX, CS, ME, etc.
    reason?: string;             // User-provided reason for change
    correlation_id: string;      // Groups related actions
  };
  
  // Rollback Information
  rollback: {
    is_rollbackable: boolean;    // Can this action be undone?
    rolled_back_by?: string;     // User who performed rollback
    rolled_back_at?: string;     // When rollback occurred
    rollback_reason?: string;
    original_log_id?: string;    // If this is a rollback entry, points to original
  };
  
  // Metadata
  metadata: {
    request_id: string;          // For tracing across services
    api_endpoint: string;        // /api/v1/events/123/scores
    http_method: string;         // POST, PUT, DELETE
    duration_ms: number;         // Request processing time
  };
}
```

---

### 2. Access Levels for View History

| Profile | Access Level | Scope | What They See |
|---------|--------------|-------|---------------|
| **Super Admin** | Global History | All events, all departments, all users | Every single action across entire platform with full details including delta |
| **Event Organizer** | Event-Specific History | Only their assigned events | Changes within their events (scores, teams, registrations, expenses) |
| **Department Head** | Branch History | All events within their department (e.g., all EX events) | Department-wide activities, can drill down to specific events |
| **Volunteers/Students** | No Access | N/A | Cannot view audit logs (security/privacy reasons) |
| **Technical Auditor** | Read-Only Global | All data, read-only | Special role for external audits, cannot perform rollbacks |

### Access Control Implementation

```python
# app/audit_access.py

class AuditAccessLevel(Enum):
    NONE = 0
    EVENT_SPECIFIC = 1
    DEPARTMENT_WIDE = 2
    GLOBAL = 3
    GLOBAL_READONLY = 4

AUDIT_ACCESS_MATRIX = {
    UserRole.SPECTATOR: AuditAccessLevel.NONE,
    UserRole.PARTICIPANT: AuditAccessLevel.NONE,
    UserRole.TEAM_LEADER: AuditAccessLevel.NONE,
    UserRole.VOLUNTEER: AuditAccessLevel.NONE,
    UserRole.LOGISTICS: AuditAccessLevel.NONE,
    UserRole.ORGANIZER: AuditAccessLevel.EVENT_SPECIFIC,
    UserRole.DEPARTMENT_HEAD: AuditAccessLevel.DEPARTMENT_WIDE,  # Special role
    UserRole.SUPER_ADMIN: AuditAccessLevel.GLOBAL,
    UserRole.TECHNICAL_AUDITOR: AuditAccessLevel.GLOBAL_READONLY
}

def get_audit_access_level(user: User) -> Tuple[AuditAccessLevel, Optional[str]]:
    """
    Returns (access_level, scope_constraint)
    scope_constraint could be event_id, department_code, or None for global
    """
    level = AUDIT_ACCESS_MATRIX.get(user.role, AuditAccessLevel.NONE)
    
    if level == AuditAccessLevel.EVENT_SPECIFIC:
        return (level, user.assigned_event_ids)  # List of event IDs they manage
    elif level == AuditAccessLevel.DEPARTMENT_WIDE:
        return (level, user.department)  # e.g., "EX", "CS"
    
    return (level, None)
```

---

### 3. The "Rollback" Feature (Super Admin Exclusive)

#### Rollback Capability Matrix

| Action Type | Rollbackable | Notes |
|-------------|--------------|-------|
| CREATE | ✅ Yes | Deletes the created record |
| UPDATE | ✅ Yes | Reverts to old_value |
| DELETE | ✅ Yes | Restores from old_value |
| LOGIN/LOGOUT | ❌ No | Not meaningful to rollback |
| OVERRIDE | ✅ Yes | Reverts the override |
| BULK_ACTION | ⚠️ Partial | Can rollback individual items |
| PERMISSION_CHANGE | ✅ Yes | Reverts permission change |

#### Rollback Implementation

```python
# app/rollback.py

class RollbackManager:
    """
    Handles restoration of previous states from audit logs
    """
    
    async def rollback_action(
        self,
        log_entry_id: str,
        super_admin_id: str,
        reason: str
    ) -> RollbackResult:
        """
        Perform rollback of a specific audit log entry
        Only Super Admins can execute rollbacks
        """
        # Fetch the log entry
        log_entry = await self.get_log_entry(log_entry_id)
        
        if not log_entry:
            raise RollbackError("Log entry not found")
        
        if not log_entry['rollback']['is_rollbackable']:
            raise RollbackError("This action cannot be rolled back")
        
        if log_entry['rollback'].get('rolled_back_at'):
            raise RollbackError("This action has already been rolled back")
        
        # Verify super admin permissions
        admin = await get_user(super_admin_id)
        if admin.role != UserRole.SUPER_ADMIN:
            raise PermissionError("Only Super Admins can perform rollbacks")
        
        # Begin transaction
        async with db.transaction():
            try:
                # Perform the actual rollback based on action type
                if log_entry['action_type'] == 'DELETE':
                    await self._rollback_delete(log_entry)
                elif log_entry['action_type'] == 'UPDATE':
                    await self._rollback_update(log_entry)
                elif log_entry['action_type'] == 'CREATE':
                    await self._rollback_create(log_entry)
                elif log_entry['action_type'] == 'OVERRIDE':
                    await self._rollback_override(log_entry)
                
                # Mark original log as rolled back
                await self._mark_rolled_back(log_entry_id, super_admin_id, reason)
                
                # Create new audit log entry for the rollback itself
                rollback_log_id = await self._log_rollback(
                    original_log=log_entry,
                    performed_by=super_admin_id,
                    reason=reason
                )
                
                # Send notifications
                await self._notify_rollback(log_entry, super_admin_id, reason)
                
                return RollbackResult(
                    success=True,
                    rollback_log_id=rollback_log_id,
                    affected_records=self._get_affected_records(log_entry)
                )
                
            except Exception as e:
                await db.rollback()
                raise RollbackError(f"Rollback failed: {str(e)}")
    
    async def _rollback_delete(self, log_entry: dict):
        """Restore a deleted record"""
        old_data = log_entry['delta']['old_value']
        resource_type = log_entry['target']['resource_type']
        
        # Re-create the record with original ID if possible
        table_name = self._get_table_for_resource(resource_type)
        
        # Check if ID is still available
        existing = await db.fetch_one(
            f"SELECT id FROM {table_name} WHERE id = :id",
            {"id": old_data['id']}
        )
        
        if existing:
            # ID taken, generate new but store original_id in metadata
            old_data['original_id'] = old_data.pop('id')
            old_data['id'] = str(uuid.uuid4())
            old_data['restored_from_delete'] = True
            old_data['restored_at'] = datetime.utcnow()
        
        await db.execute(
            f"INSERT INTO {table_name} ({', '.join(old_data.keys())}) "
            f"VALUES ({', '.join([':' + k for k in old_data.keys()])})",
            old_data
        )
    
    async def _rollback_update(self, log_entry: dict):
        """Revert an update to previous state"""
        old_data = log_entry['delta']['old_value']
        resource_type = log_entry['target']['resource_type']
        resource_id = log_entry['target']['resource_id']
        
        table_name = self._get_table_for_resource(resource_type)
        
        # Build update query for changed fields only
        changed_fields = log_entry['delta']['changed_fields']
        set_clause = ', '.join([f"{field} = :{field}" for field in changed_fields])
        
        params = {field: old_data[field] for field in changed_fields}
        params['id'] = resource_id
        params['updated_at'] = datetime.utcnow()
        params['rolled_back_from_log'] = log_entry['id']
        
        await db.execute(
            f"UPDATE {table_name} SET {set_clause}, updated_at = :updated_at, "
            f"rolled_back_from_log = :rolled_back_from_log WHERE id = :id",
            params
        )
    
    async def _rollback_create(self, log_entry: dict):
        """Delete a created record"""
        resource_type = log_entry['target']['resource_type']
        resource_id = log_entry['target']['resource_id']
        
        table_name = self._get_table_for_resource(resource_type)
        
        # Soft delete instead of hard delete to maintain referential integrity
        await db.execute(
            f"UPDATE {table_name} SET "
            f"deleted_at = :deleted_at, "
            f"deleted_via_rollback = true, "
            f"rollback_log_id = :log_id "
            f"WHERE id = :id",
            {
                "deleted_at": datetime.utcnow(),
                "log_id": log_entry['id'],
                "id": resource_id
            }
        )
    
    async def _rollback_override(self, log_entry: dict):
        """Revert a Super Admin override"""
        # Similar to UPDATE but with special handling for bypassed validations
        old_data = log_entry['delta']['old_value']
        
        # Re-apply old values
        await self._rollback_update(log_entry)
        
        # Add flag indicating this was an override rollback
        resource_type = log_entry['target']['resource_type']
        table_name = self._get_table_for_resource(resource_type)
        
        await db.execute(
            f"UPDATE {table_name} SET override_rolled_back = true WHERE id = :id",
            {"id": log_entry['target']['resource_id']}
        )
    
    async def _log_rollback(self, original_log: dict, performed_by: str, reason: str) -> str:
        """Create audit log entry for the rollback action itself"""
        rollback_entry = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow(),
            "actor": {
                "user_id": performed_by,
                "role": "SUPER_ADMIN"
            },
            "action_type": "ROLLBACK",
            "severity": "CRITICAL",
            "target": {
                "resource_type": "AUDIT_LOG",
                "resource_id": original_log['id'],
                "resource_name": f"Rollback of {original_log['action_type']}"
            },
            "delta": {
                "old_value": original_log,
                "new_value": None,
                "changed_fields": ["rolled_back"]
            },
            "context": {
                "reason": reason,
                "original_action": original_log['action_type']
            }
        }
        
        await db.execute(
            "INSERT INTO audit_logs (id, data) VALUES (:id, :data)",
            {"id": rollback_entry['id'], "data": json.dumps(rollback_entry)}
        )
        
        return rollback_entry['id']
    
    async def _notify_rollback(self, original_log: dict, admin_id: str, reason: str):
        """Send notifications about rollback"""
        # Email to original actor
        original_actor = await get_user(original_log['actor']['user_id'])
        admin = await get_user(admin_id)
        
        await send_email(
            to=original_actor.email,
            subject="Action Rolled Back - BCE Event Manager",
            template="rollback_notification",
            data={
                "actor_name": original_actor.name,
                "action_type": original_log['action_type'],
                "target": original_log['target']['resource_name'],
                "rolled_back_by": admin.name,
                "reason": reason,
                "timestamp": datetime.utcnow()
            }
        )
        
        # Slack notification to all Super Admins
        await send_slack_notification(
            channel="#admin-alerts",
            message=f"🚨 ROLLBACK ALERT\n"
                   f"Admin: {admin.name}\n"
                   f"Rolled back: {original_log['action_type']} by {original_log['actor']['name']}\n"
                   f"Target: {original_log['target']['resource_name']}\n"
                   f"Reason: {reason}"
        )

# API Endpoint
@router.post("/admin/audit/{log_id}/rollback")
@require_super_admin
async def rollback_action(
    log_id: str,
    request: RollbackRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Rollback a previous action using audit log
    Requires explicit confirmation with reason
    """
    # Verify confirmation token
    if not await verify_rollback_token(request.confirmation_token, log_id):
        raise HTTPException(400, "Invalid or expired confirmation token")
    
    manager = RollbackManager()
    result = await manager.rollback_action(
        log_entry_id=log_id,
        super_admin_id=current_user.id,
        reason=request.reason
    )
    
    return {
        "success": True,
        "message": "Action successfully rolled back",
        "rollback_log_id": result.rollback_log_id,
        "affected_records": result.affected_records
    }
```

#### Rollback UI Flow

```typescript
// Frontend rollback confirmation flow
interface RollbackFlow {
  step1_selectLog: {
    // Super Admin browses history
    // Clicks "Rollback" on desired entry
  };
  
  step2_preview: {
    // Show before/after comparison
    // Display warning about consequences
    // List affected related records
  };
  
  step3_confirm: {
    // Require typing: "ROLLBACK {ACTION_TYPE}"
    // Require reason (minimum 20 characters)
    // Re-authenticate with password
    // Generate confirmation token
  };
  
  step4_execute: {
    // API call with confirmation token
    // Show progress indicator
    // Display rollback result
  };
  
  step5_audit: {
    // Log the rollback action
    // Send notifications
    // Update UI to show rolled-back status
  };
}
```

---

### 4. Search and Filter (Forensics)

#### Filter Options

```typescript
interface AuditLogFilters {
  // Time Range
  date_from: string;           // ISO date
  date_to: string;
  time_preset: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 
               'this_month' | 'last_month' | 'custom';
  
  // Actor Filters
  user_id: string;             // Specific user
  user_role: UserRole[];       // Filter by role
  enrollment_number: string;   // RGPV format
  
  // Action Filters
  action_types: ActionType[];
  severity: SeverityLevel[];
  
  // Target Filters
  resource_type: ResourceType[];
  resource_id: string;
  event_id: string;
  department: string;          // EX, CS, ME, etc.
  
  // Content Filters
  search_query: string;        // Full-text search
  has_delta_changes: boolean;  // Only entries with before/after
  is_rollbackable: boolean;    // Only actions that can be undone
  is_rolled_back: boolean;     // Show already rolled-back actions
  
  // Criticality Highlighting
  show_critical_only: boolean;
  show_deletions: boolean;
  show_overrides: boolean;     // Super Admin bypasses
  show_score_changes: boolean;
}
```

#### Visual Indicators

```css
/* Criticality Colors */
.audit-log-entry.severity-EMERGENCY {
  border-left: 4px solid #dc2626;  /* Red */
  background: #fef2f2;
}

.audit-log-entry.severity-CRITICAL {
  border-left: 4px solid #ea580c;  /* Orange */
  background: #fff7ed;
}

.audit-log-entry.severity-WARNING {
  border-left: 4px solid #ca8a04;  /* Yellow */
  background: #fefce8;
}

.audit-log-entry.action-DELETE {
  color: #dc2626;
  font-weight: bold;
}

.audit-log-entry.action-OVERRIDE {
  background: #f3e8ff;  /* Purple tint for Super Admin overrides */
  border-left-color: #9333ea;
}

.audit-log-entry.rolled-back {
  opacity: 0.6;
  text-decoration: line-through;
}
```

#### Search API

```python
@router.get("/admin/audit/search")
async def search_audit_logs(
    filters: AuditLogFilters = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user)
):
    """
    Search and filter audit logs with role-based access control
    """
    # Determine access level
    access_level, scope = get_audit_access_level(current_user)
    
    if access_level == AuditAccessLevel.NONE:
        raise HTTPException(403, "Access denied")
    
    # Build query based on access level
    query = db.table("audit_logs").select("*")
    
    # Apply scope constraints
    if access_level == AuditAccessLevel.EVENT_SPECIFIC:
        query = query.in_("context->event_id", scope)
    elif access_level == AuditAccessLevel.DEPARTMENT_WIDE:
        query = query.eq("context->department", scope)
    
    # Apply filters
    if filters.date_from:
        query = query.gte("timestamp", filters.date_from)
    if filters.date_to:
        query = query.lte("timestamp", filters.date_to)
    if filters.user_id:
        query = query.eq("actor->user_id", filters.user_id)
    if filters.action_types:
        query = query.in_("action_type", filters.action_types)
    if filters.severity:
        query = query.in_("severity", filters.severity)
    if filters.resource_type:
        query = query.eq("target->resource_type", filters.resource_type)
    if filters.event_id:
        query = query.eq("context->event_id", filters.event_id)
    if filters.search_query:
        query = query.text_search("search_vector", filters.search_query)
    
    # Special filters for high-risk actions
    if filters.show_deletions:
        query = query.eq("action_type", "DELETE")
    if filters.show_overrides:
        query = query.eq("action_type", "OVERRIDE")
    
    # Sort by timestamp descending (newest first)
    query = query.order("timestamp", desc=True)
    
    # Execute with pagination
    total = await query.count()
    results = await query.range(
        pagination.offset,
        pagination.offset + pagination.limit
    ).execute()
    
    return {
        "data": results.data,
        "pagination": {
            "total": total,
            "offset": pagination.offset,
            "limit": pagination.limit,
            "has_more": total > pagination.offset + pagination.limit
        }
    }
```

---

### 5. Immutability Guarantee

#### Database-Level Protection

```sql
-- Prevent any modification of audit logs
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- Even prevent Super Admin from truncating the table
CREATE OR REPLACE FUNCTION prevent_audit_truncate()
RETURNS EVENT_TRIGGER AS $$
BEGIN
    IF tg_tag = 'TRUNCATE' THEN
        RAISE EXCEPTION 'Cannot truncate audit_logs table';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER prevent_audit_truncate_trigger
    ON sql_drop
    EXECUTE FUNCTION prevent_audit_truncate();
```

#### Application-Level Protection

```python
# app/audit.py

class ImmutableAuditLog:
    """
    Ensures audit logs cannot be modified even by Super Admin
    """
    
    async def insert(self, entry: dict):
        """Only allowed operation: INSERT"""
        await db.execute(
            "INSERT INTO audit_logs (id, data) VALUES (:id, :data)",
            {"id": entry['id'], "data": json.dumps(entry)}
        )
    
    async def update(self, *args, **kwargs):
        """FORBIDDEN: Always raises exception"""
        raise PermissionError("Audit logs are immutable - updates not allowed")
    
    async def delete(self, *args, **kwargs):
        """FORBIDDEN: Always raises exception"""
        raise PermissionError("Audit logs are immutable - deletion not allowed")
    
    async def get(self, log_id: str) -> Optional[dict]:
        """Allowed: Read-only access"""
        result = await db.fetch_one(
            "SELECT data FROM audit_logs WHERE id = :id",
            {"id": log_id}
        )
        return json.loads(result['data']) if result else None
    
    async def query(self, filters: dict) -> List[dict]:
        """Allowed: Read-only query"""
        # Implementation uses SELECT only
        pass

# Usage
audit_log = ImmutableAuditLog()

# This works
await audit_log.insert(new_entry)

# These raise exceptions
await audit_log.update(log_id, changes)  # ❌ PermissionError
await audit_log.delete(log_id)            # ❌ PermissionError
```

---

### 6. Audit Log Dashboard UI

#### Dashboard Layout

```typescript
// AuditLogDashboard.tsx

interface AuditLogDashboardProps {
  userRole: UserRole;
  accessLevel: AuditAccessLevel;
}

const AuditLogDashboard: React.FC<AuditLogDashboardProps> = ({ 
  userRole, 
  accessLevel 
}) => {
  return (
    <div className="audit-dashboard">
      {/* Header */}
      <AuditHeader 
        title="Activity History"
        accessLevel={accessLevel}
        totalLogs={stats.total}
        criticalAlerts={stats.critical_count}
      />
      
      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        availableFilters={getAvailableFilters(accessLevel)}
        quickFilters={[
          { label: "Deletions", icon: "🗑️", filter: { action_types: ["DELETE"] } },
          { label: "Score Changes", icon: "⚽", filter: { show_score_changes: true } },
          { label: "Overrides", icon: "👑", filter: { show_overrides: true } },
          { label: "Failed Logins", icon: "🔒", filter: { action_types: ["LOGIN_FAILED"] } },
        ]}
      />
      
      {/* Stats Cards */}
      <StatsRow>
        <StatCard 
          title="Total Actions Today" 
          value={stats.today_count}
          trend={stats.trend}
        />
        <StatCard 
          title="Critical Actions" 
          value={stats.critical_count}
          alert={stats.critical_count > 0}
        />
        <StatCard 
          title="Rollbacks Performed" 
          value={stats.rollback_count}
        />
        <StatCard 
          title="Active Users" 
          value={stats.unique_users_today}
        />
      </StatsRow>
      
      {/* Main Log Table */}
      <AuditLogTable
        logs={logs}
        onSelect={setSelectedLog}
        onRollback={canRollback ? handleRollback : undefined}
        showRollbackButton={accessLevel === AuditAccessLevel.GLOBAL}
      />
      
      {/* Detail Drawer */}
      <LogDetailDrawer
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        deltaViewer={<DeltaViewer old={selectedLog?.delta.old_value} new={selectedLog?.delta.new_value} />}
        timeline={<RelatedActionsTimeline correlationId={selectedLog?.context.correlation_id} />}
      />
    </div>
  );
};
```

#### Delta Viewer Component

```typescript
// Shows before/after comparison

interface DeltaViewerProps {
  old: any;
  new: any;
}

const DeltaViewer: React.FC<DeltaViewerProps> = ({ old, new: newValue }) => {
  const diff = computeDiff(old, newValue);
  
  return (
    <div className="delta-viewer">
      <div className="diff-section removed">
        <h4>Before</h4>
        <JSONTree data={old} highlight={diff.removed} />
      </div>
      
      <div className="diff-arrow">→</div>
      
      <div className="diff-section added">
        <h4>After</h4>
        <JSONTree data={newValue} highlight={diff.added} />
      </div>
      
      <div className="diff-summary">
        <h4>Changed Fields</h4>
        <ul>
          {diff.changed_fields.map(field => (
            <li key={field}>
              <span className="field-name">{field}</span>:
              <span className="old-value">{old[field]}</span>
              →
              <span className="new-value">{newValue[field]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
```

---

### 7. Retention and Archival

```python
# Audit retention policy

class AuditRetentionManager:
    """
    Manages audit log lifecycle
    """
    
    RETENTION_POLICIES = {
        "CRITICAL": timedelta(days=2555),    # 7 years
        "EMERGENCY": timedelta(days=2555),   # 7 years
        "ROLLBACK": timedelta(days=2555),    # 7 years (rollback records)
        "OVERRIDE": timedelta(days=1825),    # 5 years (Super Admin overrides)
        "DELETE": timedelta(days=1825),      # 5 years (deletions)
        "WARNING": timedelta(days=1095),     # 3 years
        "INFO": timedelta(days=730),         # 2 years
    }
    
    async def archive_old_logs(self):
        """
        Move old logs to cold storage
        Does NOT delete - just moves to cheaper storage
        """
        for severity, retention in self.RETENTION_POLICIES.items():
            cutoff_date = datetime.utcnow() - retention
            
            # Move to archive table
            await db.execute("""
                INSERT INTO audit_logs_archive
                SELECT * FROM audit_logs
                WHERE severity = :severity
                AND timestamp < :cutoff
                AND id NOT IN (
                    SELECT original_log_id FROM audit_logs 
                    WHERE action_type = 'ROLLBACK'
                )
            """, {"severity": severity, "cutoff": cutoff_date})
            
            # Delete from active table only after archival
            await db.execute("""
                DELETE FROM audit_logs
                WHERE severity = :severity
                AND timestamp < :cutoff
            """, {"severity": severity, "cutoff": cutoff_date})
```

---

## Security & Audit Trail

### Critical Action Confirmation

```python
# app/utils/confirmation.py

CRITICAL_ACTIONS = {
    "delete_event": {
        "requires_confirmation": True,
        "confirmation_type": "text_input",  # Must type event name
        "warning_message": "This will permanently delete the event and all associated data."
    },
    "delete_user": {
        "requires_confirmation": True,
        "confirmation_type": "dual_confirm",  # Two-step confirmation
        "warning_message": "This will permanently delete the user account."
    },
    "impersonate_user": {
        "requires_confirmation": True,
        "confirmation_type": "password_reauth",  # Must re-enter password
        "warning_message": "You are about to impersonate another user."
    },
    "maintenance_mode": {
        "requires_confirmation": True,
        "confirmation_type": "text_input",
        "expected_input": "ENABLE MAINTENANCE",
        "warning_message": "This will lock the entire platform for all users."
    }
}

@router.post("/admin/critical-action/initiate")
@require_super_admin
async def initiate_critical_action(
    action_type: str,
    target_id: str,
    current_user: User = Depends(get_current_user)
):
    """Start confirmation flow for dangerous actions"""
    config = CRITICAL_ACTIONS.get(action_type)
    if not config:
        raise HTTPException(400, "Unknown action type")
    
    # Generate confirmation token
    confirmation_token = secrets.token_urlsafe(32)
    await redis.setex(
        f"confirm:{current_user.id}:{action_type}:{target_id}",
        timedelta(minutes=5),
        confirmation_token
    )
    
    return {
        "requires_confirmation": True,
        "confirmation_type": config["confirmation_type"],
        "warning_message": config["warning_message"],
        "expected_input": config.get("expected_input"),
        "confirmation_token": confirmation_token,
        "expires_in": "5 minutes"
    }
```

### Comprehensive Audit Logging

```python
# app/audit.py

class AuditLogger:
    async def log(self, event: dict):
        """Log audit event to database"""
        await supabase.table("audit_logs").insert({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow(),
            "user_id": event.get("user_id"),
            "user_role": event.get("role"),
            "action": event.get("action"),
            "resource_type": event.get("resource_type"),
            "resource_id": event.get("resource_id"),
            "old_value": event.get("old_value"),
            "new_value": event.get("new_value"),
            "ip_address": event.get("ip"),
            "user_agent": event.get("user_agent"),
            "is_super_admin_action": event.get("role") == "SUPER_ADMIN"
        })

# Log all Super Admin actions specially
async def log_super_admin_action(user_id: str, action: str, details: dict = None):
    await audit.log({
        "level": "CRITICAL",
        "user_id": user_id,
        "role": "SUPER_ADMIN",
        "action": action,
        "details": details,
        "alert_channels": ["email", "slack"]  # Immediate notification
    })
```

---

## Database Schema

### Role & Permission Tables

```sql
-- User roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'participant',
        'team_leader', 
        'volunteer',
        'logistics',
        'organizer',
        'super_admin'
    )),
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,  -- For temporary roles
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role)
);

-- Event-specific role assignments
CREATE TABLE event_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- organizer, volunteer, logistics
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    permissions JSONB,  -- Override default permissions
    UNIQUE(event_id, user_id, role)
);

-- Global bans table
CREATE TABLE global_bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_number VARCHAR(50) NOT NULL,
    banned_by UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    ban_type VARCHAR(50) NOT NULL,  -- ALL_EVENTS, SPECIFIC_EVENT, CATEGORY
    event_id UUID REFERENCES events(id),
    category VARCHAR(100),
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    lifted_by UUID REFERENCES users(id),
    lifted_at TIMESTAMP,
    lift_reason TEXT
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    is_super_admin_action BOOLEAN DEFAULT false,
    confirmation_token UUID
);

-- Create indexes for audit log queries
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_super_admin ON audit_logs(is_super_admin_action) WHERE is_super_admin_action = true;

-- Impersonation sessions
CREATE TABLE impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    super_admin_id UUID REFERENCES users(id),
    target_user_id UUID REFERENCES users(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    reason TEXT NOT NULL,
    actions_taken JSONB DEFAULT '[]',
    session_token_hash VARCHAR(255)
);
```

---

## Frontend Route Guards

### React Router Protection

```typescript
// frontend/src/components/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireSuperAdmin?: boolean;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SPECTATOR]: 0,
  [UserRole.PARTICIPANT]: 1,
  [UserRole.TEAM_LEADER]: 2,
  [UserRole.VOLUNTEER]: 3,
  [UserRole.LOGISTICS]: 4,
  [UserRole.ORGANIZER]: 5,
  [UserRole.SUPER_ADMIN]: 99
};

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireSuperAdmin = false 
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super Admin bypass
  if (user?.role === UserRole.SUPER_ADMIN) {
    // Add visual indicator
    return (
      <>
        <SuperAdminIndicator />
        {children}
      </>
    );
  }

  if (requireSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && user?.role) {
    const userLevel = ROLE_HIERARCHY[user.role];
    const minRequired = Math.min(...allowedRoles.map(r => ROLE_HIERARCHY[r]));
    
    if (userLevel < minRequired) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}

// Super Admin visual indicator component
function SuperAdminIndicator() {
  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-1 z-50 text-sm font-bold">
      ⚠️ GOD MODE ACTIVE - All Restrictions Bypassed ⚠️
    </div>
  );
}
```

### Route Configuration

```typescript
// frontend/src/App.tsx (Route definitions)

<Route
  path="/admin/*"
  element={
    <ProtectedRoute requireSuperAdmin>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/events/:id/manage"
  element={
    <ProtectedRoute allowedRoles={[UserRole.ORGANIZER, UserRole.SUPER_ADMIN]}>
      <EventManagement />
    </ProtectedRoute>
  }
/>

<Route
  path="/scorekeeper"
  element={
    <ProtectedRoute allowedRoles={[UserRole.VOLUNTEER, UserRole.ORGANIZER, UserRole.SUPER_ADMIN]}>
      <Scorekeeper />
    </ProtectedRoute>
  }
/>

<Route
  path="/team/:id/manage"
  element={
    <ProtectedRoute allowedRoles={[UserRole.TEAM_LEADER, UserRole.ORGANIZER, UserRole.SUPER_ADMIN]}>
      <TeamManagement />
    </ProtectedRoute>
  }
/>
```

---

## Implementation Checklist

### Phase 1: Core RBAC
- [ ] Create role enum and hierarchy
- [ ] Implement `require_role` decorator
- [ ] Add role check to all existing endpoints
- [ ] Create database tables for roles
- [ ] Frontend route guards

### Phase 2: Super Admin Features
- [ ] Implement bypass logic
- [ ] Create impersonation system
- [ ] Build global ban functionality
- [ ] Add maintenance mode
- [ ] Critical action confirmations

### Phase 3: Audit & Security
- [ ] Comprehensive audit logging
- [ ] Super Admin action alerts
- [ ] Audit log viewer dashboard
- [ ] Data integrity checks

### Phase 4: Advanced Features
- [ ] Time-limited role assignments
- [ ] Event-specific permission overrides
- [ ] Role request workflow
- [ ] Automated permission audits

---

## Important Notes

### Super Admin Safety Measures

1. **Two-Factor Authentication**: Super Admin accounts MUST have 2FA enabled
2. **Action Logging**: Every Super Admin action is logged with full context
3. **Session Timeout**: Super Admin sessions expire after 30 minutes of inactivity
4. **Concurrent Session Limit**: Only 2 active Super Admin sessions allowed
5. **Change Notifications**: All Super Admin actions trigger email notifications to other Super Admins
6. **Undo Capability**: Critical deletions have 24-hour grace period for restoration

### Recommended Super Admin Assignment

**BCE Context:**
- 1 Faculty-in-Charge (CSE Department)
- 1 Technical Head (Portal Developer)
- 1 HOD Representative (Rotating per department during events)

Total: **Maximum 3 active Super Admin accounts** at any given time

---

## Contact & Maintenance

**Document Owner:** Technical Team, BCE Event Manager  
**Review Cycle:** Every semester  
**Last Security Audit:** March 2026  

For questions or clarifications, contact the Technical Head or Faculty-in-Charge.

---

*"With great power comes great responsibility."*  
*— Every Super Admin before clicking "Confirm"*
