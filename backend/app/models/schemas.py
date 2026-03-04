"""Pydantic models for request/response validation."""
from pydantic import BaseModel, EmailStr, Field, field_validator
import re
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pathlib import Path
from urllib.parse import urlparse


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
    HACKATHON = "hackathon"
    CODING_COMPETITION = "coding_competition"
    CULTURAL = "cultural"
    WORKSHOP = "workshop"
    PAPER_PRESENTATION = "paper_presentation"
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
    enrollment_number: Optional[str] = Field(None, max_length=20)
    branch: Optional[str] = Field(None, max_length=50)
    year: Optional[int] = Field(None, ge=1, le=5)
    college_name: Optional[str] = Field(None, max_length=255)
    is_external: bool = False


class UserCreate(UserBase):
    password: str = Field(..., min_length=12)
    role: UserRole = UserRole.ATTENDEE

    @field_validator('password')
    @classmethod
    def validate_password_complexity(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$', v):
            raise ValueError('Password must be 12+ chars with uppercase, lowercase, number, and special char')
        return v


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
    category: Optional[str] = Field(None, max_length=50)
    start_date: datetime
    end_date: datetime
    venue: str = Field(..., min_length=1, max_length=255)
    max_participants: int = Field(..., gt=0)
    registration_deadline: datetime
    registration_fee: float = Field(0.00, ge=0)
    currency: str = Field('INR', max_length=3)
    submission_deadline: Optional[datetime] = None


class EventCreate(EventBase):
    config_data: Optional[Dict[str, Any]] = None


class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    event_type: Optional[EventType] = None
    category: Optional[str] = Field(None, max_length=50)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    venue: Optional[str] = Field(None, min_length=1, max_length=255)
    max_participants: Optional[int] = Field(None, gt=0)
    registration_deadline: Optional[datetime] = None
    registration_fee: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    status: Optional[EventStatus] = None
    submission_deadline: Optional[datetime] = None


class EventResponse(EventBase):
    id: str
    organizer_id: str
    status: EventStatus
    cover_image: Optional[str] = None
    registration_fee: float
    currency: str
    submission_deadline: Optional[datetime] = None
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


# Match Commentary Models
class MatchCommentaryBase(BaseModel):
    content: str
    type: str = "general"
    team_id: Optional[str] = None
    player_id: Optional[str] = None

class MatchCommentaryCreate(MatchCommentaryBase):
    match_id: str

class MatchCommentaryResponse(MatchCommentaryBase):
    id: str
    match_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Score History Models
class ScoreHistoryBase(BaseModel):
    match_id: str
    score_team1: int
    score_team2: int
    changed_by: Optional[str] = None

class ScoreHistoryResponse(ScoreHistoryBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Bracket Generation
class BracketGenerateRequest(BaseModel):
    bracket_type: BracketType
    event_id: str


# Event Type Config Models
class EventTypeConfigBase(BaseModel):
    config_type: str = Field(..., max_length=50)
    config_data: dict

class EventTypeConfigCreate(EventTypeConfigBase):
    event_id: str

class EventTypeConfigResponse(EventTypeConfigBase):
    id: str
    event_id: str
    created_at: datetime

    class Config:
        from_attributes = True


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
    receipt: Optional[str] = None

    @field_validator('receipt')
    @classmethod
    def validate_receipt(cls, v):
        if v:
            parsed = urlparse(v)
            if parsed.scheme not in ["http", "https"]:
                raise ValueError("Receipt must be a valid URL")
            ext = Path(parsed.path).suffix.lower()
            if ext and ext not in ['.pdf', '.jpg', '.jpeg', '.png']:
                raise ValueError("Invalid file extension")
        return v


class ExpenseUpdate(BaseModel):
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[float] = Field(None, ge=0)
    date: Optional[datetime] = None
    receipt: Optional[str] = None

    @field_validator('receipt')
    @classmethod
    def validate_receipt(cls, v):
        if v:
            parsed = urlparse(v)
            if parsed.scheme not in ["http", "https"]:
                raise ValueError("Receipt must be a valid URL")
            ext = Path(parsed.path).suffix.lower()
            if ext and ext not in ['.pdf', '.jpg', '.jpeg', '.png']:
                raise ValueError("Invalid file extension")
        return v


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


# Organizer Analytics Models
class OrganizerOverviewStats(BaseModel):
    """Overview statistics for organizer dashboard."""
    total_events: int
    active_events: int
    draft_events: int
    total_registrations: int
    confirmed_registrations: int
    checkin_rate: float
    total_revenue: float
    collection_rate: float
    total_expenses: float
    budget_utilization: float


class RegistrationTrend(BaseModel):
    """Daily registration trend data."""
    date: str
    registrations: int
    checkins: int


class RevenueByEvent(BaseModel):
    """Revenue breakdown by event."""
    event_id: str
    event_name: str
    revenue: float
    target: float


class PaymentBreakdown(BaseModel):
    """Payment status breakdown."""
    status: str
    count: int
    amount: float


class AttendanceFunnel(BaseModel):
    """Attendance funnel stages."""
    stage: str
    count: int


class EventPerformance(BaseModel):
    """Performance metrics for a single event."""
    event_id: str
    name: str
    type: str
    status: str
    start_date: datetime
    registrations: int
    capacity: int
    fill_rate: float
    revenue: float
    expenses: float
    profit: float
    checkin_rate: float
    trend: str


class RecentActivity(BaseModel):
    """Recent activity item."""
    id: str
    type: str
    description: str
    timestamp: datetime
    user_name: Optional[str] = None
    event_name: Optional[str] = None


class OrganizerAnalytics(BaseModel):
    """Complete organizer analytics response."""
    overview: OrganizerOverviewStats
    registration_trends: List[RegistrationTrend]
    revenue_by_event: List[RevenueByEvent]
    payment_breakdown: List[PaymentBreakdown]
    attendance_funnel: List[AttendanceFunnel]
    events: List[EventPerformance]
    recent_activity: List[RecentActivity]


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


# ============================================
# Phase 2: Tech Events Models
# ============================================

# Project Submissions
class ProjectSubmissionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    github_url: Optional[str] = None
    demo_video_url: Optional[str] = None
    pitch_deck_url: Optional[str] = None
    tech_stack: Optional[List[str]] = None

class ProjectSubmissionCreate(ProjectSubmissionBase):
    event_id: str
    team_id: str

class ProjectSubmissionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    github_url: Optional[str] = None
    demo_video_url: Optional[str] = None
    pitch_deck_url: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    status: Optional[str] = None

class ProjectSubmissionResponse(ProjectSubmissionBase):
    id: str
    event_id: str
    team_id: str
    submitted_at: datetime
    status: str

    class Config:
        from_attributes = True

# Judging Rubrics
class JudgingRubricBase(BaseModel):
    criteria_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    max_score: int = Field(10, gt=0)
    weight: float = Field(1.0, gt=0)
    display_order: int = 0

class JudgingRubricCreate(JudgingRubricBase):
    event_id: str

class JudgingRubricResponse(JudgingRubricBase):
    id: str
    event_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Submission Scores
class SubmissionScoreBase(BaseModel):
    score: int = Field(..., ge=0)
    comments: Optional[str] = None

class SubmissionScoreCreate(SubmissionScoreBase):
    submission_id: str
    rubric_id: str

class SubmissionScoreResponse(SubmissionScoreBase):
    id: str
    submission_id: str
    judge_id: str
    rubric_id: str
    scored_at: datetime

    class Config:
        from_attributes = True

# Team Requests
class TeamRequestStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    cancelled = "cancelled"

class TeamRequestBase(BaseModel):
    message: Optional[str] = None

class TeamRequestCreate(TeamRequestBase):
    team_id: str

class TeamRequestUpdate(BaseModel):
    status: TeamRequestStatus

class TeamRequestResponse(TeamRequestBase):
    id: str
    team_id: str
    user_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Mentorship
class MentorBase(BaseModel):
    expertise_areas: List[str]
    bio: Optional[str] = None
    is_available: bool = True

class MentorCreate(MentorBase):
    event_id: str
    user_id: str

class MentorResponse(MentorBase):
    id: str
    event_id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class MentorshipSlotBase(BaseModel):
    start_time: datetime
    end_time: datetime
    meeting_link: Optional[str] = None

class MentorshipSlotCreate(MentorshipSlotBase):
    mentor_id: str

class MentorshipSlotResponse(MentorshipSlotBase):
    id: str
    mentor_id: str
    is_booked: bool

    class Config:
        from_attributes = True

class MentorshipBookingCreate(BaseModel):
    slot_id: str
    team_id: str
    notes: Optional[str] = None

class MentorshipBookingResponse(BaseModel):
    id: str
    slot_id: str
    team_id: str
    notes: Optional[str] = None
    booked_at: datetime

    class Config:
        from_attributes = True
# ============================================
# Phase 4: Cultural & Academic
# ============================================

class PerformanceStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ParticipantType(str, Enum):
    INDIVIDUAL = "individual"
    TEAM = "team"

class CulturalPerformanceCreate(BaseModel):
    participant_id: str
    participant_type: ParticipantType
    title: str
    description: Optional[str] = None
    duration_minutes: int = 10

class CulturalPerformanceResponse(CulturalPerformanceCreate):
    id: str
    event_id: str
    scheduled_start: Optional[datetime] = None
    status: PerformanceStatus
    created_at: datetime

    class Config:
        from_attributes = True

class PerformanceRequirementCreate(BaseModel):
    requirement_type: str # 'audio', 'lighting', 'props', 'other'
    details: str

class PerformanceRequirementResponse(PerformanceRequirementCreate):
    id: str
    performance_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class PaperSubmissionStatus(str, Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    REVISION_REQUIRED = "revision_required"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class PaperSubmissionCreate(BaseModel):
    title: str
    abstract: str
    file_url: Optional[str] = None

class PaperSubmissionResponse(PaperSubmissionCreate):
    id: str
    event_id: str
    author_id: str
    status: PaperSubmissionStatus
    submission_date: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PaperReviewCreate(BaseModel):
    score: int = Field(..., ge=0, le=100)
    comments: Optional[str] = None

class PaperReviewResponse(PaperReviewCreate):
    id: str
    submission_id: str
    reviewer_id: str
    reviewed_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Phase 1: Hackathon Team Skills Models
# ============================================

class ProficiencyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class TeamSkillBase(BaseModel):
    skill_name: str = Field(..., min_length=1, max_length=100)
    skill_category: Optional[str] = Field(None, max_length=50)
    proficiency_level: ProficiencyLevel = ProficiencyLevel.INTERMEDIATE


class TeamSkillCreate(TeamSkillBase):
    team_id: str


class TeamSkillUpdate(BaseModel):
    skill_name: Optional[str] = Field(None, min_length=1, max_length=100)
    skill_category: Optional[str] = Field(None, max_length=50)
    proficiency_level: Optional[ProficiencyLevel] = None


class TeamSkillResponse(TeamSkillBase):
    id: str
    team_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class TeamRequirementBase(BaseModel):
    skill_name: str = Field(..., min_length=1, max_length=100)
    skill_category: Optional[str] = Field(None, max_length=50)
    required_count: int = Field(1, ge=1)
    priority: Priority = Priority.MEDIUM


class TeamRequirementCreate(TeamRequirementBase):
    team_id: str


class TeamRequirementUpdate(BaseModel):
    skill_name: Optional[str] = Field(None, min_length=1, max_length=100)
    skill_category: Optional[str] = Field(None, max_length=50)
    required_count: Optional[int] = Field(None, ge=1)
    priority: Optional[Priority] = None
    is_filled: Optional[bool] = None


class TeamRequirementResponse(TeamRequirementBase):
    id: str
    team_id: str
    is_filled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserSkillBase(BaseModel):
    skill_name: str = Field(..., min_length=1, max_length=100)
    skill_category: Optional[str] = Field(None, max_length=50)
    proficiency_level: ProficiencyLevel = ProficiencyLevel.INTERMEDIATE
    years_experience: Optional[int] = Field(None, ge=0)


class UserSkillCreate(UserSkillBase):
    pass


class UserSkillUpdate(BaseModel):
    skill_name: Optional[str] = Field(None, min_length=1, max_length=100)
    skill_category: Optional[str] = Field(None, max_length=50)
    proficiency_level: Optional[ProficiencyLevel] = None
    years_experience: Optional[int] = Field(None, ge=0)


class UserSkillResponse(UserSkillBase):
    id: str
    user_id: str
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InviteStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class TeamInviteBase(BaseModel):
    invitee_email: Optional[EmailStr] = None
    role: str = Field("member", max_length=50)
    message: Optional[str] = None


class TeamInviteCreate(TeamInviteBase):
    team_id: str
    inviter_id: str


class TeamInviteUpdate(BaseModel):
    status: Optional[InviteStatus] = None


class TeamInviteResponse(TeamInviteBase):
    id: str
    team_id: str
    inviter_id: str
    invitee_id: Optional[str] = None
    status: str
    expires_at: Optional[datetime] = None
    created_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================
# Notification Models
# ============================================

class NotificationType(str, Enum):
    REGISTRATION = "registration"
    TEAM_UPDATE = "team_update"
    ANNOUNCEMENT = "announcement"
    JUDGING = "judging"
    SUBMISSION = "submission"
    INVITE = "invite"
    REMINDER = "reminder"
    SYSTEM = "system"


class NotificationBase(BaseModel):
    type: NotificationType
    title: str = Field(..., min_length=1, max_length=255)
    message: str
    link: Optional[str] = Field(None, max_length=500)


class NotificationCreate(NotificationBase):
    user_id: str


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferencesBase(BaseModel):
    email_enabled: bool = True
    push_enabled: bool = True
    event_reminders: bool = True
    team_updates: bool = True
    new_announcements: bool = True
    judging_updates: bool = True


class NotificationPreferencesCreate(NotificationPreferencesBase):
    user_id: str


class NotificationPreferencesUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    event_reminders: Optional[bool] = None
    team_updates: Optional[bool] = None
    new_announcements: Optional[bool] = None
    judging_updates: Optional[bool] = None


class NotificationPreferencesResponse(NotificationPreferencesBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Team Message Models
# ============================================

class TeamMessageBase(BaseModel):
    message: str = Field(..., min_length=1)
    attachments: List[Dict[str, Any]] = []
    is_announcement: bool = False


class TeamMessageCreate(TeamMessageBase):
    team_id: str


class TeamMessageUpdate(BaseModel):
    message: Optional[str] = Field(None, min_length=1)
    is_announcement: Optional[bool] = None


class TeamMessageResponse(TeamMessageBase):
    id: str
    team_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Event Announcement Models (Enhanced)
# ============================================

class AnnouncementPriority(str, Enum):
    NORMAL = "normal"
    IMPORTANT = "important"
    URGENT = "urgent"


class EventAnnouncementBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    is_pinned: bool = False
    is_draft: bool = False


class EventAnnouncementCreate(EventAnnouncementBase):
    event_id: str
    author_id: str
    scheduled_for: Optional[datetime] = None


class EventAnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    priority: Optional[AnnouncementPriority] = None
    is_pinned: Optional[bool] = None
    is_draft: Optional[bool] = None
    scheduled_for: Optional[datetime] = None
    published_at: Optional[datetime] = None


class EventAnnouncementResponse(EventAnnouncementBase):
    id: str
    event_id: str
    author_id: str
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Submission Version Models
# ============================================

class SubmissionVersionBase(BaseModel):
    version: int = Field(..., ge=1)
    project_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    github_url: Optional[str] = None
    demo_video_url: Optional[str] = None
    pitch_deck_url: Optional[str] = None
    additional_links: List[Dict[str, Any]] = []
    is_final: bool = False


class SubmissionVersionCreate(SubmissionVersionBase):
    registration_id: str


class SubmissionVersionResponse(SubmissionVersionBase):
    id: str
    registration_id: str
    submitted_at: datetime

    class Config:
        from_attributes = True
