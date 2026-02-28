"""Pydantic models for request/response validation."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    ORGANIZER = "organizer"
    CAPTAIN = "captain"
    ATTENDEE = "attendee"


class EventType(str, Enum):
    SPORTS = "sports"
    TECH_FEST = "tech_fest"
    SEMINAR = "seminar"
    OTHER = "other"


class EventStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TeamStatus(str, Enum):
    REGISTERED = "registered"
    CONFIRMED = "confirmed"
    ELIMINATED = "eliminated"
    WINNER = "winner"


class MatchStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RegistrationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    PAID = "paid"
    REFUNDED = "refunded"


class SponsorTier(str, Enum):
    PLATINUM = "platinum"
    GOLD = "gold"
    SILVER = "silver"
    BRONZE = "bronze"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class VolunteerStatus(str, Enum):
    ASSIGNED = "assigned"
    ON_DUTY = "on_duty"
    COMPLETED = "completed"


class BracketType(str, Enum):
    KNOCKOUT = "knockout"
    ROUND_ROBIN = "round_robin"


# User Models
class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.ATTENDEE


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


class UserResponse(UserBase):
    id: str
    role: UserRole
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Admin-specific user update (Super Admin can change roles)
class AdminUserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None
    is_verified: Optional[bool] = None


# Event Models
class EventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str
    event_type: EventType
    start_date: datetime
    end_date: datetime
    venue: str = Field(..., min_length=1, max_length=255)
    max_participants: int = Field(..., gt=0)
    registration_deadline: datetime


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    event_type: Optional[EventType] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    venue: Optional[str] = Field(None, min_length=1, max_length=255)
    max_participants: Optional[int] = Field(None, gt=0)
    registration_deadline: Optional[datetime] = None
    status: Optional[EventStatus] = None


class EventResponse(EventBase):
    id: str
    organizer_id: str
    status: EventStatus
    cover_image: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Team Models
class TeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class TeamCreate(TeamBase):
    event_id: str


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[TeamStatus] = None
    captain_id: Optional[str] = None


class TeamResponse(TeamBase):
    id: str
    event_id: str
    captain_id: Optional[str] = None
    status: TeamStatus
    created_at: datetime

    class Config:
        from_attributes = True


# Team Member Models
class TeamMemberBase(BaseModel):
    user_id: str
    role: str = Field(..., min_length=1, max_length=50)
    jersey_number: Optional[int] = None


class TeamMemberCreate(TeamMemberBase):
    team_id: str


class TeamMemberResponse(TeamMemberBase):
    id: str
    team_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Match Models
class MatchBase(BaseModel):
    event_id: str
    team1_id: str
    team2_id: str
    match_date: datetime
    venue: str = Field(..., min_length=1, max_length=255)


class MatchCreate(MatchBase):
    pass


class MatchUpdate(BaseModel):
    score_team1: Optional[int] = Field(None, ge=0)
    score_team2: Optional[int] = Field(None, ge=0)
    status: Optional[MatchStatus] = None
    winner_id: Optional[str] = None


class MatchResponse(MatchBase):
    id: str
    score_team1: int
    score_team2: int
    status: MatchStatus
    winner_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Bracket Generation
class BracketGenerateRequest(BaseModel):
    bracket_type: BracketType
    event_id: str


# Registration Models
class RegistrationCreate(BaseModel):
    event_id: str
    team_id: Optional[str] = None
    payment_amount: float = Field(0, ge=0)


class RegistrationUpdate(BaseModel):
    status: Optional[RegistrationStatus] = None
    payment_status: Optional[PaymentStatus] = None
    transaction_id: Optional[str] = None


class RegistrationResponse(BaseModel):
    id: str
    user_id: str
    event_id: str
    team_id: Optional[str] = None
    status: RegistrationStatus
    payment_status: PaymentStatus
    payment_amount: float
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    qr_code: Optional[str] = None
    checked_in_at: Optional[datetime] = None
    registered_at: datetime

    class Config:
        from_attributes = True


# Check-in
class CheckInResponse(BaseModel):
    registration_id: str
    user_id: str
    event_id: str
    checked_in_at: datetime
    message: str


# Expense Models
class ExpenseBase(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=255)
    amount: float = Field(..., ge=0)
    date: datetime


class ExpenseCreate(ExpenseBase):
    event_id: str


class ExpenseUpdate(BaseModel):
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[float] = Field(None, ge=0)
    date: Optional[datetime] = None


class ExpenseResponse(ExpenseBase):
    id: str
    event_id: str
    created_by_id: Optional[str] = None
    receipt: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Sponsor Models
class SponsorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    website_url: Optional[str] = None
    tier: SponsorTier
    display_order: int = 0


class SponsorCreate(SponsorBase):
    event_id: str


class SponsorResponse(SponsorBase):
    id: str
    event_id: str
    logo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Announcement Models
class AnnouncementBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: str
    priority: Priority = Priority.LOW


class AnnouncementCreate(AnnouncementBase):
    event_id: str


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    message: Optional[str] = None
    priority: Optional[Priority] = None


class AnnouncementResponse(AnnouncementBase):
    id: str
    event_id: str
    created_by_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Volunteer Models
class VolunteerBase(BaseModel):
    role: str = Field(..., min_length=1, max_length=100)


class VolunteerCreate(VolunteerBase):
    event_id: str
    shift_id: Optional[str] = None


class VolunteerResponse(VolunteerBase):
    id: str
    user_id: str
    event_id: str
    shift_id: Optional[str] = None
    status: VolunteerStatus
    created_at: datetime

    class Config:
        from_attributes = True


# Shift Models
class ShiftBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    start_time: datetime
    end_time: datetime
    location: str = Field(..., min_length=1, max_length=255)
    required_volunteers: int = Field(..., gt=0)


class ShiftCreate(ShiftBase):
    event_id: str


class ShiftResponse(ShiftBase):
    id: str
    event_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Feedback Models
class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Audit Log Models
class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    action: str
    target_type: str
    target_id: Optional[str] = None
    changes: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Platform Stats (Super Admin)
class PlatformStats(BaseModel):
    total_users: int
    total_events: int
    total_registrations: int
    total_revenue: float
    active_events: int
    users_by_role: dict


# Certificate Request
class CertificateRequest(BaseModel):
    event_id: str
    user_id: Optional[str] = None


# Analytics Models
class EventAnalytics(BaseModel):
    total_registrations: int
    confirmed_registrations: int
    pending_registrations: int
    total_teams: int
    total_matches: int
    completed_matches: int
    total_revenue: float
    total_expenses: float
    net_profit: float
    registration_timeline: List[dict]
    demographics: List[dict]


# Auth Models
class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Generic Response
class MessageResponse(BaseModel):
    message: str
    success: bool = True
