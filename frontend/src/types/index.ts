// User Types
export type UserRole = 'super_admin' | 'admin' | 'organizer' | 'captain' | 'attendee'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: UserRole
  is_verified: boolean
  created_at: string
}

// Event Types
export type EventType = 'sports' | 'tech_fest' | 'seminar' | 'other'
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled'

export interface Event {
  id: string
  name: string
  description: string
  event_type: EventType
  organizer_id: string
  start_date: string
  end_date: string
  venue: string
  max_participants: number
  registration_deadline: string
  status: EventStatus
  cover_image?: string
  created_at: string
  updated_at?: string
}

export interface EventCreate {
  name: string
  description: string
  event_type: EventType
  start_date: string
  end_date: string
  venue: string
  max_participants: number
  registration_deadline: string
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
