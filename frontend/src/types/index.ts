// User Types
export type UserRole = 'super_admin' | 'admin' | 'organizer' | 'captain' | 'attendee'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  enrollment_number?: string
  branch?: string
  year?: number
  college_name?: string
  is_external: boolean
  role: UserRole
  is_verified: boolean
  created_at: string
}

// Event Types
export type EventType = 'sports' | 'tech_fest' | 'seminar' | 'hackathon' | 'coding_competition' | 'cultural' | 'workshop' | 'paper_presentation' | 'other'
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled'

export interface Event {
  id: string
  name: string
  description: string
  event_type: EventType
  category?: string
  organizer_id: string
  start_date: string
  end_date: string
  venue: string
  max_participants: number
  current_participants?: number
  registration_fee?: number
  currency?: string
  registration_deadline: string
  submission_deadline?: string
  status: EventStatus
  cover_image?: string
  registrations_open?: boolean
  created_at: string
  updated_at?: string
}

export interface EventCreate {
  name: string
  description: string
  event_type: EventType
  category?: string
  start_date: string
  end_date: string
  venue: string
  max_participants: number
  registration_deadline: string
}

export interface EventTypeConfig {
  id: string
  event_id: string
  config_type: string
  config_data: Record<string, any>
  created_at: string
}

// Team Types
export type TeamStatus = 'registered' | 'confirmed' | 'eliminated' | 'winner'

export interface Team {
  id: string
  name: string
  event_id: string
  captain_id?: string
  status: TeamStatus
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: string
  jersey_number?: number
  is_active: boolean
  created_at: string
}

// Match Types
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface Match {
  id: string
  event_id: string
  team1_id: string
  team2_id: string
  score_team1: number
  score_team2: number
  match_date: string
  venue: string
  status: MatchStatus
  winner_id?: string
  round?: number
  created_at: string
}

export interface MatchCommentary {
  id: string
  match_id: string
  content: string
  type: 'general' | 'goal' | 'foul' | 'substitution' | 'period_start' | 'period_end'
  team_id?: string
  player_id?: string
  created_at: string
}

// Registration Types
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface Registration {
  id: string
  user_id: string
  event_id: string
  team_id?: string
  status: RegistrationStatus
  payment_status: PaymentStatus
  payment_amount: number
  payment_method?: string
  transaction_id?: string
  qr_code?: string
  checked_in_at?: string
  registered_at: string
}

// Expense Types
export interface Expense {
  id: string
  event_id: string
  category: string
  description: string
  amount: number
  date: string
  receipt?: string
  created_by_id?: string
  created_at: string
}

// Announcement Types
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Announcement {
  id: string
  event_id: string
  title: string
  message: string
  priority: Priority
  created_by_id?: string
  created_at: string
}

// Volunteer Types
export type VolunteerStatus = 'assigned' | 'on_duty' | 'completed'

export interface Volunteer {
  id: string
  user_id: string
  event_id: string
  shift_id?: string
  role: string
  status: VolunteerStatus
  created_at: string
}

export interface Shift {
  id: string
  event_id: string
  name: string
  start_time: string
  end_time: string
  location: string
  required_volunteers: number
  created_at: string
}

// Feedback Types
export interface Feedback {
  id: string
  event_id: string
  user_id: string
  rating: number
  comment?: string
  created_at: string
}

export interface FeedbackSummary {
  event_id: string
  average_rating: number
  total_feedback: number
}

// Audit Log Types
export interface AuditLog {
  id: string
  actor_id?: string
  action: string
  target_type: string
  target_id?: string
  changes?: Record<string, unknown>
  created_at: string
}

// Platform Stats
export interface PlatformStats {
  total_users: number
  total_events: number
  total_registrations: number
  total_revenue: number
  active_events: number
  users_by_role: Record<string, number>
}

// Analytics Types
export interface EventAnalytics {
  total_registrations: number
  confirmed_registrations: number
  pending_registrations: number
  total_teams: number
  total_matches: number
  completed_matches: number
  total_revenue: number
  total_expenses: number
  net_profit: number
  registration_timeline: { date: string; count: number }[]
  demographics: { category: string; count: number }[]
}

// Organizer Analytics Types
export interface OrganizerOverviewStats {
  total_events: number
  active_events: number
  draft_events: number
  total_registrations: number
  confirmed_registrations: number
  checkin_rate: number
  total_revenue: number
  collection_rate: number
  total_expenses: number
  budget_utilization: number
}

export interface RegistrationTrend {
  date: string
  registrations: number
  checkins: number
}

export interface RevenueByEvent {
  event_id: string
  event_name: string
  revenue: number
  target: number
}

export interface PaymentBreakdown {
  status: string
  count: number
  amount: number
}

export interface AttendanceFunnel {
  stage: string
  count: number
}

export interface EventPerformance {
  event_id: string
  name: string
  type: string
  status: string
  start_date: string
  registrations: number
  capacity: number
  fill_rate: number
  revenue: number
  expenses: number
  profit: number
  checkin_rate: number
  trend: string
}

export interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: string
  user_name?: string
  event_name?: string
}

export interface OrganizerAnalytics {
  overview: OrganizerOverviewStats
  registration_trends: RegistrationTrend[]
  revenue_by_event: RevenueByEvent[]
  payment_breakdown: PaymentBreakdown[]
  attendance_funnel: AttendanceFunnel[]
  events: EventPerformance[]
  recent_activity: RecentActivity[]
}

// Auth Types
export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  enrollment_number?: string
  branch?: string
  year?: number
  college_name?: string
  is_external?: boolean
  role?: UserRole
}

// API Response Types
export interface ApiErrorResponse {
  detail: string
}

export interface MessageResponse {
  message: string
  success: boolean
}

// ============================================
// Phase 2: Tech Events
// ============================================

export interface ProjectSubmission {
  id: string
  event_id: string
  team_id: string
  title: string
  description?: string
  github_url?: string
  demo_video_url?: string
  pitch_deck_url?: string
  tech_stack?: string[]
  submitted_at: string
  status: 'submitted' | 'under_review' | 'qualified' | 'rejected'
}

export type ProjectSubmissionCreate = Omit<ProjectSubmission, 'id' | 'submitted_at' | 'status'>
export type ProjectSubmissionUpdate = Partial<ProjectSubmissionCreate> & { status?: ProjectSubmission['status'] }

export interface JudgingRubric {
  id: string
  event_id: string
  criteria_name: string
  description?: string
  max_score: number
  weight: number
  display_order: number
  created_at: string
}

export type JudgingRubricCreate = Omit<JudgingRubric, 'id' | 'created_at'>

export interface SubmissionScore {
  id: string
  submission_id: string
  judge_id: string
  rubric_id: string
  score: number
  comments?: string
  scored_at: string
}

export type SubmissionScoreCreate = Omit<SubmissionScore, 'id' | 'judge_id' | 'scored_at'>

export interface LeaderboardEntry {
  submission_id: string
  title: string
  team_id: string
  score: number
}

// Team Requests
export type TeamRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export interface TeamRequest {
  id: string
  team_id: string
  user_id: string
  message?: string
  status: TeamRequestStatus
  created_at: string
  updated_at: string
}

export interface TeamRequestCreate {
  team_id: string
  message?: string
}

// Mentorship
export interface Mentor {
  id: string
  event_id: string
  user_id: string
  expertise_areas: string[]
  bio?: string
  is_available: boolean
  created_at: string
}

export interface MentorshipSlot {
  id: string
  mentor_id: string
  start_time: string
  end_time: string
  is_booked: boolean
  meeting_link?: string
}

export interface MentorshipBooking {
  id: string
  slot_id: string
  team_id: string
  notes?: string
  booked_at: string
}

export interface MentorshipBookingCreate {
  slot_id: string
  team_id: string
  notes?: string
}

// ============================================
// Phase 3: Communication & Notifications
// ============================================

export interface Notification {
  id: string
  user_id: string
  type: 'registration' | 'team' | 'announcement' | 'judging' | 'reminder' | 'system'
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  email_enabled: boolean
  push_enabled: boolean
  event_reminders: boolean
  team_updates: boolean
  new_announcements: boolean
  judging_updates: boolean
}

export interface TeamMessage {
  id: string
  team_id: string
  user_id?: string
  message: string
  attachments?: string[]
  is_announcement: boolean
  created_at: string
  updated_at?: string
}

export interface TeamMessageCreate {
  team_id: string
  message: string
  attachments?: string[]
  is_announcement?: boolean
}

// ============================================
// Phase 3: Team Skills & Matching
// ============================================

export interface UserSkill {
  id: string
  user_id: string
  skill_name: string
  proficiency_level: number
  created_at: string
}

export interface TeamSkill {
  id: string
  team_id: string
  skill_name: string
  proficiency_level: number
  created_at: string
}

export interface TeamRequirement {
  id: string
  team_id: string
  skill_name: string
  priority: number
  is_required: boolean
  created_at: string
}

export interface TeamInvite {
  id: string
  team_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  updated_at: string
}

export interface TeamRecommendation {
  user_id: string
  matching_skills: { skill_name: string; proficiency_level: number }[]
  score: number
}

// ============================================
// Phase 3: Analytics
// ============================================

export interface UserActivityLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface EventMetrics {
  id: string
  event_id: string
  date: string
  unique_visitors: number
  page_views: number
  registrations: number
  submissions: number
  active_participants: number
  engagement_score?: number
}

export interface DashboardSummary {
  total_events: number
  total_users: number
  recent_registrations: number
  active_events: number
  period_days: number
}

export interface RegistrationTrend {
  date: string
  registrations: number
}

// ============================================
// Phase 3: Project Submission
// ============================================

export interface SubmissionVersion {
  id: string
  submission_id: string
  version_number: number
  github_url?: string
  demo_video_url?: string
  pitch_deck_url?: string
  submitted_at: string
}

export interface WaitlistEntry {
  id: string
  event_id: string
  user_id: string
  position: number
  created_at: string
}

export interface WaitlistInfo {
  is_on_waitlist: boolean
  is_registered?: boolean
  position?: number
  spots_available?: number
  estimated_wait_hours?: number
  registered_at?: string
  message?: string
}

export interface RegistrationStats {
  event_id: string
  event_name: string
  max_participants: number
  registration_deadline?: string
  status_breakdown: {
    confirmed: number
    pending: number
    cancelled: number
  }
  waitlist: number
  payment_breakdown: {
    paid: number
    unpaid: number
    total_revenue: number
  }
  checked_in: number
}
