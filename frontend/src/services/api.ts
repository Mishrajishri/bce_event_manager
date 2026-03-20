import { useAuthStore } from '../store'
import type {
  Event,
  EventCreate,
  EventAnalytics,
  Team,
  TeamMember,
  Match,
  Registration,
  Expense,
  Announcement,
  Volunteer,
  Shift,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  AuditLog,
  PlatformStats,
  Feedback,
  FeedbackSummary,
  ProjectSubmission,
  ProjectSubmissionCreate,
  ProjectSubmissionUpdate,
  JudgingRubric,
  JudgingRubricCreate,
  SubmissionScore,
  SubmissionScoreCreate,
  LeaderboardEntry,
  TeamRequest,
  TeamRequestCreate,
  Mentor,
  MentorCreate,
  MentorUpdate,
  MentorshipSlot,
  MentorshipSlotCreate,
  MentorshipBooking,
  MentorshipBookingCreate,
  MentorshipBookingUpdate,
  MentorshipFeedback,
  MentorshipFeedbackCreate,
  MentorRecommendation,
  MentorStats,
  OrganizerAnalytics,
  Milestone,
  TeamMilestone,
  MilestoneSubmission,
  MilestoneSubmissionType,
  MilestoneReminder,
  TeamMilestoneProgress,
  MilestoneStatus,
  Prize,
  PrizeCategory,
  PrizeWinner,
  PrizeSponsor,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// ---------------------------------------------------------------------------
// F1 — Status-specific API error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status

    // Assign human-readable code
    switch (status) {
      case 401:
        this.code = 'UNAUTHORIZED'
        break
      case 403:
        this.code = 'FORBIDDEN'
        break
      case 404:
        this.code = 'NOT_FOUND'
        break
      case 422:
        this.code = 'VALIDATION_ERROR'
        break
      default:
        this.code = status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR'
    }
  }
}

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<any> {
  const { accessToken, refreshToken, setAuth, clearAuth } = useAuthStore.getState()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`
  }

  let response = await fetch(url, { ...options, headers })

  // Handle Token Refresh Interceptor
  if (response.status === 401 && refreshToken && !url.includes('/auth/refresh') && !url.includes('/auth/login')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`, { method: 'POST' });

        if (refreshRes.ok) {
          const authData = await refreshRes.json();
          setAuth(authData.user, authData.access_token, authData.refresh_token);
          processQueue(null, authData.access_token);

          // Replay original request with new token
          (headers as Record<string, string>)['Authorization'] = `Bearer ${authData.access_token}`;
          response = await fetch(url, { ...options, headers });
        } else {
          clearAuth();
          processQueue(new ApiError(401, 'Session expired'));
          throw new ApiError(401, 'Session expired');
        }
      } catch (err) {
        clearAuth();
        processQueue(err);
        throw err;
      } finally {
        isRefreshing = false;
      }
    } else {
      // Queue requests while refreshing
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(newToken => {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        return fetch(url, { ...options, headers }).then(async res => {
          if (!res.ok) throw new ApiError(res.status, 'Request failed after refresh');
          if (res.status === 204) return null;
          return res.json();
        });
      });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: 'An error occurred' }))
    const message = body?.error?.message || body?.detail || 'Request failed'

    if (response.status === 401) {
      clearAuth()
    }

    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return null

  return response.json()
}

// Auth API
export const authApi = {
  login: (data: LoginRequest) =>
    fetchWithAuth(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<AuthResponse>,

  register: (data: RegisterRequest) =>
    fetchWithAuth(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<AuthResponse>,

  logout: () =>
    fetchWithAuth(`${API_BASE_URL}/auth/logout`, { method: 'POST' }),

  me: () =>
    fetchWithAuth(`${API_BASE_URL}/auth/me`) as Promise<User>,

  updateProfile: (data: Partial<User>) =>
    fetchWithAuth(`${API_BASE_URL}/auth/me`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<User>,
}

// Events API
export const eventsApi = {
  list: (params?: { status?: string; event_type?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchWithAuth(`${API_BASE_URL}/events${query ? `?${query}` : ''}`) as Promise<Event[]>
  },

  get: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${id}`) as Promise<Event>,

  create: (data: EventCreate) =>
    fetchWithAuth(`${API_BASE_URL}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Event>,

  update: (id: string, data: Partial<EventCreate>) =>
    fetchWithAuth(`${API_BASE_URL}/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Event>,

  delete: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${id}`, { method: 'DELETE' }),

  analytics: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${id}/analytics`) as Promise<EventAnalytics>,

  getConfig: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${id}/config`) as Promise<any>,

  updateConfig: (id: string, data: Record<string, any>) =>
    fetchWithAuth(`${API_BASE_URL}/events/${id}/config`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Teams API
export const teamsApi = {
  listByEvent: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/teams`) as Promise<Team[]>,

  create: (eventId: string, data: { name: string }) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Team>,

  get: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/teams/${id}`) as Promise<Team>,

  update: (id: string, data: Partial<Team>) =>
    fetchWithAuth(`${API_BASE_URL}/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Team>,

  addMember: (teamId: string, data: { user_id: string; role: string }) =>
    fetchWithAuth(`${API_BASE_URL}/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<TeamMember>,

  removeMember: (teamId: string, userId: string) =>
    fetchWithAuth(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    }),

  listMembers: (teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/teams/${teamId}/members`) as Promise<TeamMember[]>,
}

// Matches API
export const matchesApi = {
  listByEvent: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/matches`) as Promise<Match[]>,

  get: (eventId: string, matchId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/matches/${matchId}`) as Promise<Match>,

  create: (eventId: string, data: Omit<Match, 'id' | 'created_at'>) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/matches`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Match>,

  update: (eventId: string, matchId: string, data: Partial<Match>) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/matches/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Match>,

  generateBrackets: (eventId: string, bracketType: 'knockout' | 'round_robin') =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/matches/brackets/generate`, {
      method: 'POST',
      body: JSON.stringify({ bracket_type: bracketType }),
    }),

  getBrackets: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/matches/brackets`),

  listCommentary: (eventId: string, matchId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/matches/${matchId}/commentary`) as Promise<any[]>,

  addCommentary: (eventId: string, matchId: string, data: { content: string, type?: string, team_id?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/matches/${matchId}/commentary`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Cultural API
export const culturalApi = {
  listPerformances: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/cultural/performances`) as Promise<any[]>,

  createPerformance: (eventId: string, data: any) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/cultural/performances`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addRequirement: (eventId: string, performanceId: string, data: any) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/cultural/performances/${performanceId}/requirements`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (eventId: string, performanceId: string, status: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/cultural/performances/${performanceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

// Academic API
export const academicApi = {
  listSubmissions: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/academic/submissions`) as Promise<any[]>,

  submitPaper: (eventId: string, data: any) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/academic/submissions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reviewPaper: (eventId: string, submissionId: string, data: any) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/academic/submissions/${submissionId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (eventId: string, submissionId: string, status: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/academic/submissions/${submissionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

// Registrations API
export const registrationsApi = {
  register: (eventId: string, data: { team_id?: string; payment_amount?: number }) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Registration>,

  myRegistrations: () =>
    fetchWithAuth(`${API_BASE_URL}/registrations/my`) as Promise<Registration[]>,

  listByEvent: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/registrations`) as Promise<Registration[]>,

  updateStatus: (id: string, data: { status?: string; payment_status?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/registrations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Registration>,

  checkIn: (eventId: string, qrCode: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/check-in?qr_code=${encodeURIComponent(qrCode)}`, {
      method: 'POST',
    }),
}

// Expenses API
export const expensesApi = {
  listByEvent: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/expenses`) as Promise<Expense[]>,

  create: (eventId: string, data: Omit<Expense, 'id' | 'created_at'>) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Expense>,

  update: (eventId: string, expenseId: string, data: Partial<Expense>) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Expense>,

  delete: (eventId: string, expenseId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/expenses/${expenseId}`, {
      method: 'DELETE',
    }),
}

// Announcements API
export const announcementsApi = {
  listByEvent: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/announcements`) as Promise<Announcement[]>,

  create: (eventId: string, data: Omit<Announcement, 'id' | 'created_at'>) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Announcement>,

  delete: (eventId: string, announcementId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/announcements/${announcementId}`, {
      method: 'DELETE',
    }),
}

// Volunteers API
export const volunteersApi = {
  listShifts: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/shifts`) as Promise<Shift[]>,

  createShift: (eventId: string, data: Omit<Shift, 'id' | 'created_at'>) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/shifts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Shift>,

  listVolunteers: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/volunteers`) as Promise<Volunteer[]>,

  assignToShift: (eventId: string, shiftId: string, data: { role: string }) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/shifts/${shiftId}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Volunteer>,
}

// Admin API (Super Admin only)
export const adminApi = {
  listUsers: (params?: { search?: string; role?: string }) => {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return fetchWithAuth(`${API_BASE_URL}/admin/users${query ? `?${query}` : ''}`) as Promise<User[]>
  },

  getUser: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`) as Promise<User>,

  updateUser: (id: string, data: { first_name?: string; last_name?: string; role?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<User>,

  resetPassword: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/admin/users/${id}/reset-password`, { method: 'POST' }),

  deleteUser: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`, { method: 'DELETE' }),

  listAllEvents: (params?: { status?: string }) => {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return fetchWithAuth(`${API_BASE_URL}/admin/events${query ? `?${query}` : ''}`) as Promise<Event[]>
  },

  reassignEvent: (eventId: string, newOrganizerId: string) =>
    fetchWithAuth(`${API_BASE_URL}/admin/events/${eventId}/reassign?new_organizer_id=${newOrganizerId}`, {
      method: 'PUT',
    }),

  cloneEvent: (eventId: string, newName: string) =>
    fetchWithAuth(`${API_BASE_URL}/admin/events/${eventId}/clone`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    }),

  getAuditLogs: (params?: { action?: string; target_type?: string }) => {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return fetchWithAuth(`${API_BASE_URL}/admin/audit-logs${query ? `?${query}` : ''}`) as Promise<AuditLog[]>
  },

  getStats: () =>
    fetchWithAuth(`${API_BASE_URL}/admin/stats`) as Promise<PlatformStats>,

  exportUsersCSV: () => `${API_BASE_URL}/admin/export/users`,

  // Bulk user actions
  bulkUserAction: async (data: { user_ids: string[]; action: string; role?: string }) => {
    return fetchWithAuth(`${API_BASE_URL}/admin/users/bulk-action`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<{ message: string }>;
  },

  // Enhanced stats
  getEnhancedStats: () =>
    fetchWithAuth(`${API_BASE_URL}/admin/stats/enhanced`) as Promise<{
      total_users: number;
      total_events: number;
      total_registrations: number;
      total_revenue: number;
      active_events: number;
      users_by_role: Record<string, number>;
      events_by_status: Record<string, number>;
      registrations_by_status: Record<string, number>;
      recent_registrations: number;
      events_by_type: Record<string, number>;
      revenue_by_month: Array<{ month: string; revenue: number }>;
      registrations_by_month: Array<{ month: string; count: number }>;
      user_growth_by_month: Array<{ month: string; count: number }>;
      top_organizers: Array<{ id: string; email: string; name: string; event_count: number }>;
      recent_activity: Array<{ type: string; description: string; timestamp: string }>;
    }>,

  // Audit logs export
  exportAuditLogsCSV: (params?: { action?: string; target_type?: string; actor_id?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return `${API_BASE_URL}/admin/export/audit-logs${query ? `?${query}` : ''}`;
  },

  // System settings
  getSystemSettings: () =>
    fetchWithAuth(`${API_BASE_URL}/admin/settings`) as Promise<Record<string, any>>,

  updateSystemSettings: async (settings: Record<string, any>) =>
    fetchWithAuth(`${API_BASE_URL}/admin/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }) as Promise<{ message: string; settings: Record<string, any> }>,
}

// Feedback API
export const feedbackApi = {
  list: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/feedback`) as Promise<Feedback[]>,

  create: (eventId: string, data: { rating: number; comment?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Feedback>,

  summary: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/events/${eventId}/feedback/summary`) as Promise<FeedbackSummary>,
}

// Certificates API
export const certificatesApi = {
  download: (eventId: string) => `${API_BASE_URL}/events/${eventId}/certificate`,
}

// Tech Events API
export const techApi = {
  submitProject: (data: ProjectSubmissionCreate) =>
    fetchWithAuth(`${API_BASE_URL}/tech/submissions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<ProjectSubmission>,

  updateSubmission: (id: string, data: ProjectSubmissionUpdate) =>
    fetchWithAuth(`${API_BASE_URL}/tech/submissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<ProjectSubmission>,

  listSubmissions: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/tech/events/${eventId}/submissions`) as Promise<ProjectSubmission[]>,

  createRubric: (eventId: string, data: JudgingRubricCreate) =>
    fetchWithAuth(`${API_BASE_URL}/tech/events/${eventId}/rubrics`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<JudgingRubric>,

  listRubrics: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/tech/events/${eventId}/rubrics`) as Promise<JudgingRubric[]>,

  submitScore: (submissionId: string, data: SubmissionScoreCreate) =>
    fetchWithAuth(`${API_BASE_URL}/tech/submissions/${submissionId}/scores`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<SubmissionScore>,

  getLeaderboard: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/tech/events/${eventId}/leaderboard`) as Promise<LeaderboardEntry[]>,

  // Team Requests
  createTeamRequest: (data: TeamRequestCreate) =>
    fetchWithAuth(`${API_BASE_URL}/tech/team-requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<TeamRequest>,

  listTeamRequests: (teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/tech/teams/${teamId}/requests`) as Promise<TeamRequest[]>,

  listMyRequests: () =>
    fetchWithAuth(`${API_BASE_URL}/tech/team-requests/my`) as Promise<TeamRequest[]>,

  updateTeamRequest: (requestId: string, status: 'accepted' | 'declined' | 'cancelled') =>
    fetchWithAuth(`${API_BASE_URL}/tech/team-requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }) as Promise<TeamRequest>,

  // Mentorship
  listMentors: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/tech/events/${eventId}/mentors`) as Promise<Mentor[]>,

  listMentorSlots: (mentor_id: string) =>
    fetchWithAuth(`${API_BASE_URL}/tech/mentors/${mentor_id}/slots`) as Promise<MentorshipSlot[]>,

  bookMentorship: (data: MentorshipBookingCreate) =>
    fetchWithAuth(`${API_BASE_URL}/tech/mentorship/bookings`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<MentorshipBooking>,
}

// Enhanced Mentorship API - Phase 7
export const mentorshipApi = {
  // Mentor Management
  createMentor: (data: MentorCreate) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/mentors`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Mentor>,

  getMentor: (mentorId: string) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/mentors/${mentorId}`) as Promise<Mentor>,

  updateMentor: (mentorId: string, data: MentorUpdate) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/mentors/${mentorId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Mentor>,

  approveMentor: (mentorId: string) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/mentors/${mentorId}/approve`, {
      method: 'POST',
    }) as Promise<Mentor>,

  rejectMentor: (mentorId: string, rejectionReason: string) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/mentors/${mentorId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    }) as Promise<Mentor>,

  // Slot Management
  createSlot: (data: MentorshipSlotCreate) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/slots`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<MentorshipSlot>,

  updateSlot: (slotId: string, data: Partial<MentorshipSlotCreate>) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/slots/${slotId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<MentorshipSlot>,

  deleteSlot: (slotId: string) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/slots/${slotId}`, { method: 'DELETE' }),

  // Bookings
  getMyBookings: () =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/bookings/my`) as Promise<MentorshipBooking[]>,

  updateBooking: (bookingId: string, data: MentorshipBookingUpdate) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<MentorshipBooking>,

  // Feedback & Ratings
  createFeedback: (bookingId: string, data: MentorshipFeedbackCreate) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/feedback?booking_id=${bookingId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<MentorshipFeedback>,

  getMentorFeedback: (mentorId: string) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/mentors/${mentorId}/feedback`) as Promise<MentorshipFeedback[]>,

  getMentorRatings: (mentorId: string) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/mentors/${mentorId}/ratings`) as Promise<MentorRecommendation>,

  // Analytics
  getEventMentorAnalytics: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/events/${eventId}/mentor-analytics`) as Promise<any[]>,

  getMyMentorStats: () =>
    fetchWithAuth(`${API_BASE_URL}/mentorship/my-stats`) as Promise<MentorStats>,
}

// Organizer API (Organizers and above)
export const organizerApi = {
  getAnalytics: () =>
    fetchWithAuth(`${API_BASE_URL}/organizer/analytics`) as Promise<OrganizerAnalytics>,

  listEvents: () =>
    fetchWithAuth(`${API_BASE_URL}/organizer/events`) as Promise<Event[]>,

  listParticipants: (params?: {
    event_id?: string;
    status?: string;
    payment_status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchWithAuth(`${API_BASE_URL}/organizer/participants${query ? `?${query}` : ''}`) as Promise<{
      participants: Array<{
        id: string
        user_id: string
        event_id: string
        event_name: string
        event_type: string
        status: string
        payment_status: string
        payment_amount: number
        qr_code?: string
        checked_in_at?: string
        registered_at: string
        user: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone?: string
          enrollment_number?: string
          branch?: string
          college_name?: string
        }
      }>
      total: number
      limit: number
      offset: number
      events: Array<{
        id: string
        name: string
        event_type: string
        status: string
      }>
    }>
  },

  listTeams: (params?: {
    event_id?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchWithAuth(`${API_BASE_URL}/organizer/teams${query ? `?${query}` : ''}`) as Promise<{
      teams: Array<{
        id: string
        name: string
        event_id: string
        event_name: string
        event_type: string
        status: string
        captain_id?: string
        captain?: {
          id: string
          first_name: string
          last_name: string
          email: string
        }
        member_count: number
        members: Array<{
          id: string
          user_id: string
          role: string
          jersey_number?: number
          is_active: boolean
          user: {
            id: string
            first_name: string
            last_name: string
            email: string
          }
        }>
        created_at: string
      }>
      total: number
      limit: number
      offset: number
      events: Array<{
        id: string
        name: string
        event_type: string
        status: string
      }>
    }>
  },

  listExpenses: (params?: {
    event_id?: string;
    category?: string;
    min_amount?: number;
    max_amount?: number;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchWithAuth(`${API_BASE_URL}/organizer/expenses${query ? `?${query}` : ''}`) as Promise<{
      expenses: Array<{
        id: string
        event_id: string
        event_name: string
        category: string
        description: string
        amount: number
        date: string
        receipt?: string
        created_by_id?: string
        created_at: string
      }>
      total: number
      total_amount: number
      categories: Array<{
        category: string
        count: number
        total: number
      }>
      events: Array<{
        id: string
        name: string
        event_type: string
        status: string
      }>
    }>
  },

  getVolunteers: (params?: {
    event_id?: string;
    status?: string;
    shift_id?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchWithAuth(`${API_BASE_URL}/organizer/volunteers${query ? `?${query}` : ''}`) as Promise<{
      volunteers: Array<{
        id: string
        user_id: string
        event_id: string
        event_name: string
        shift_id: string
        shift_name: string
        shift_start: string
        shift_end: string
        shift_location: string
        role: string
        status: string
        checked_in_at: string | null
        hours_worked: number
        created_at: string
        user: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string
        }
      }>
      total: number
      shifts: Array<{
        id: string
        event_id: string
        name: string
        start_time: string
        end_time: string
        location: string
        required_volunteers: number
      }>
      shifts_by_event: Record<string, Array<{
        id: string
        name: string
        start_time: string
        end_time: string
        location: string
        required_volunteers: number
      }>>
      events: Array<{
        id: string
        name: string
        event_type: string
        status: string
      }>
    }>
  },

  checkInVolunteer: (volunteerId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/organizer/volunteers/${volunteerId}/check-in`, {
      method: 'POST',
    }) as Promise<{ message: string; checked_in_at: string }>
  },

  completeVolunteer: (volunteerId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/organizer/volunteers/${volunteerId}/complete`, {
      method: 'POST',
    }) as Promise<{ message: string; hours_worked: number }>
  },
}

// Event Type Configs API
export const eventConfigsApi = {
  list: (eventType?: string) => {
    const query = eventType ? `?event_type=${eventType}` : ''
    return fetchWithAuth(`${API_BASE_URL}/event-configs${query}`) as Promise<any[]>
  },

  get: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/event-configs/${id}`) as Promise<any>,

  create: (data: { name: string; event_type: string; config: Record<string, any> }) =>
    fetchWithAuth(`${API_BASE_URL}/event-configs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  update: (id: string, data: { name?: string; config?: Record<string, any> }) =>
    fetchWithAuth(`${API_BASE_URL}/event-configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<any>,

  delete: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/event-configs/${id}`, { method: 'DELETE' }),
}

// Skills API - Team matching & user skills
export const skillsApi = {
  // User skills
  getMySkills: () =>
    fetchWithAuth(`${API_BASE_URL}/skills/my`) as Promise<any[]>,

  updateMySkills: (skills: { skill_name: string; proficiency_level: number }[]) =>
    fetchWithAuth(`${API_BASE_URL}/skills/my`, {
      method: 'PUT',
      body: JSON.stringify(skills),
    }) as Promise<any[]>,

  // Team skills & requirements
  getTeamRequirements: (teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/skills/teams/${teamId}/requirements`) as Promise<any[]>,

  addTeamRequirement: (teamId: string, data: { skill_name: string; priority: number; description?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/skills/teams/${teamId}/requirements`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  removeTeamRequirement: (teamId: string, requirementId: string) =>
    fetchWithAuth(`${API_BASE_URL}/skills/teams/${teamId}/requirements/${requirementId}`, {
      method: 'DELETE',
    }),

  // Team invites
  getTeamInvites: (teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/skills/teams/${teamId}/invites`) as Promise<any[]>,

  inviteToTeam: (teamId: string, data: { user_email: string; message?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/skills/teams/${teamId}/invites`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  respondToInvite: (inviteId: string, action: 'accept' | 'decline') =>
    fetchWithAuth(`${API_BASE_URL}/skills/invites/${inviteId}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    }) as Promise<any>,

  getMyInvites: () =>
    fetchWithAuth(`${API_BASE_URL}/skills/invites/my`) as Promise<any[]>,

  // Skill matching
  findTeammates: (eventId: string, requiredSkills?: string[]) => {
    const query = requiredSkills?.length ? `?skills=${requiredSkills.join(',')}` : ''
    return fetchWithAuth(`${API_BASE_URL}/skills/match/${eventId}${query}`) as Promise<any[]>
  },

  // Available skills list
  listAvailableSkills: () =>
    fetchWithAuth(`${API_BASE_URL}/skills/available`) as Promise<any[]>,

  // Team announcements (new)
  getTeamAnnouncements: (teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/teams-enhanced/${teamId}/announcements`) as Promise<any[]>,

  createTeamAnnouncement: (teamId: string, content: string) =>
    fetchWithAuth(`${API_BASE_URL}/teams-enhanced/${teamId}/announcements`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }) as Promise<any>,

  deleteTeamAnnouncement: (teamId: string, announcementId: string) =>
    fetchWithAuth(`${API_BASE_URL}/teams-enhanced/${teamId}/announcements/${announcementId}`, {
      method: 'DELETE',
    }),

  // Team members details
  getTeamMembersDetails: (teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/teams-enhanced/${teamId}/members-details`) as Promise<{
      team: any;
      members: any[];
    }>,

  // Team Templates (new)
  createTeamTemplate: (data: { event_id: string; name: string; description?: string; min_team_size?: number; max_team_size?: number; is_public?: boolean }) =>
    fetchWithAuth(`${API_BASE_URL}/teams-enhanced/templates`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  listTeamTemplates: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/teams-enhanced/templates/event/${eventId}`) as Promise<any[]>,

  getTeamTemplate: (templateId: string) =>
    fetchWithAuth(`${API_BASE_URL}/teams-enhanced/templates/${templateId}`) as Promise<any>,

  addTemplateRole: (templateId: string, data: { role_name: string; role_description?: string; required_count?: number; skills_needed?: string[] }) =>
    fetchWithAuth(`${API_BASE_URL}/teams-enhanced/templates/${templateId}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  deleteTemplateRole: (templateId: string, roleId: string) =>
    fetchWithAuth(`${API_BASE_URL}/teams-enhanced/templates/${templateId}/roles/${roleId}`, {
      method: 'DELETE',
    }),
}

// Notifications API
export const notificationsApi = {
  list: (params?: { unread_only?: boolean; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchWithAuth(`${API_BASE_URL}/notifications${query ? `?${query}` : ''}`) as Promise<any[]>
  },

  getUnreadCount: () =>
    fetchWithAuth(`${API_BASE_URL}/notifications/unread-count`) as Promise<{ count: number }>,

  markAsRead: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PUT' }),

  markAllAsRead: () =>
    fetchWithAuth(`${API_BASE_URL}/notifications/read-all`, { method: 'PUT' }),

  delete: (id: string) =>
    fetchWithAuth(`${API_BASE_URL}/notifications/${id}`, { method: 'DELETE' }),

  // Preferences
  getPreferences: () =>
    fetchWithAuth(`${API_BASE_URL}/notifications/preferences`) as Promise<any>,

  updatePreferences: (data: { email_enabled?: boolean; push_enabled?: boolean; types?: string[] }) =>
    fetchWithAuth(`${API_BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<any>,
}

// Team Messages API
export const teamMessagesApi = {
  listChannels: () =>
    fetchWithAuth(`${API_BASE_URL}/team-messages/channels`) as Promise<any[]>,

  getChannel: (channelId: string) =>
    fetchWithAuth(`${API_BASE_URL}/team-messages/channels/${channelId}`) as Promise<any>,

  getMessages: (channelId: string, params?: { before?: string; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchWithAuth(`${API_BASE_URL}/team-messages/channels/${channelId}/messages${query ? `?${query}` : ''}`) as Promise<any[]>
  },

  sendMessage: (channelId: string, data: { content: string; message_type?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/team-messages/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  deleteMessage: (channelId: string, messageId: string) =>
    fetchWithAuth(`${API_BASE_URL}/team-messages/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
    }),

  getOrCreateChannel: (teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/team-messages/channels/team/${teamId}`, {
      method: 'POST',
    }) as Promise<any>,
}

// Enhanced Analytics API
export const analyticsEnhancedApi = {
  getUserActivity: (params?: { days?: number; event_id?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchWithAuth(`${API_BASE_URL}/analytics/activity${query ? `?${query}` : ''}`) as Promise<any[]>
  },

  getEventMetrics: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/analytics/events/${eventId}/metrics`) as Promise<any>,

  getRegistrationTrends: (params?: { days?: number; event_id?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchWithAuth(`${API_BASE_URL}/analytics/trends${query ? `?${query}` : ''}`) as Promise<any[]>
  },

  getPlatformStats: () =>
    fetchWithAuth(`${API_BASE_URL}/analytics/platform`) as Promise<any>,
}

// Judging API - Phase 6
export const judgingApi = {
  // Judge Panels
  createPanel: (data: { event_id: string; name: string; description?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/judging/panels`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  listPanels: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/panels/event/${eventId}`) as Promise<any[]>,

  getPanel: (panelId: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/panels/${panelId}`) as Promise<any>,

  addJudgeToPanel: (panelId: string, data: { user_id: string; role?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/judging/panels/${panelId}/judges`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  removeJudgeFromPanel: (panelId: string, userId: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/panels/${panelId}/judges/${userId}`, {
      method: 'DELETE',
    }),

  // Judge Assignments
  assignJudge: (data: { panel_id: string; submission_id: string; judge_id: string }) =>
    fetchWithAuth(`${API_BASE_URL}/judging/assignments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  getMyAssignments: (judgeId: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/assignments/judge/${judgeId}`) as Promise<any[]>,

  updateAssignmentStatus: (assignmentId: string, status: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/assignments/${assignmentId}/status?status=${status}`, {
      method: 'PUT',
    }) as Promise<any>,

  // Conflicts
  reportConflict: (data: { judge_id: string; submission_id: string; conflict_type: string; description?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/judging/conflicts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  getEventConflicts: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/conflicts/event/${eventId}`) as Promise<any[]>,

  checkConflicts: (submissionId: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/conflicts/check/${submissionId}`) as Promise<any>,

  // Peer Reviews
  submitPeerReview: (data: { submission_id: string; rating: number; feedback?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/judging/peer-reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  getPeerReviews: (submissionId: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/peer-reviews/submission/${submissionId}`) as Promise<any[]>,

  // Public Voting
  submitVote: (data: { submission_id: string; vote_value: number }) =>
    fetchWithAuth(`${API_BASE_URL}/judging/votes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  getVoteStats: (submissionId: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/votes/submission/${submissionId}`) as Promise<{
      total_votes: number;
      average_rating: number;
      user_voted: boolean;
      user_vote_value: number;
    }>,

  // Demo Sessions
  createDemoSession: (data: { submission_id: string; start_time: string; end_time?: string; notes?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/judging/demo-sessions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<any>,

  listDemoSessions: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/demo-sessions/event/${eventId}`) as Promise<any[]>,

  updateDemoSessionStatus: (sessionId: string, status: string) =>
    fetchWithAuth(`${API_BASE_URL}/judging/demo-sessions/${sessionId}/status?status=${status}`, {
      method: 'PUT',
    }) as Promise<any>,
}

// Milestones API - Phase 6.3
export const milestonesApi = {
  // Event milestones (organizer endpoints)
  createMilestone: (eventId: string, data: { name: string; description?: string; due_date: string; point_value?: number; is_required?: boolean; sequence_order?: number }) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/events/${eventId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Milestone>,

  listEventMilestones: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/events/${eventId}/milestones`) as Promise<Milestone[]>,

  getMilestone: (eventId: string, milestoneId: string) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/events/${eventId}/milestones/${milestoneId}`) as Promise<Milestone>,

  updateMilestone: (eventId: string, milestoneId: string, data: Partial<{ name: string; description: string; due_date: string; point_value: number; is_required: boolean; sequence_order: number }>) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/events/${eventId}/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Milestone>,

  deleteMilestone: (eventId: string, milestoneId: string) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/events/${eventId}/milestones/${milestoneId}`, { method: 'DELETE' }),

  // Team milestones
  listTeamMilestones: (teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/teams/${teamId}/milestones`) as Promise<TeamMilestone[]>,

  updateTeamMilestone: (teamId: string, milestoneId: string, data: { status?: MilestoneStatus; submission_link?: string; submission_notes?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/teams/${teamId}/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<TeamMilestone>,

  getTeamProgress: (teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/teams/${teamId}/progress`) as Promise<TeamMilestoneProgress>,

  // Milestone submissions (checkpoints)
  createSubmission: (teamMilestoneId: string, data: { submission_type: MilestoneSubmissionType; submission_url: string; description?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/team-milestones/${teamMilestoneId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<MilestoneSubmission>,

  listSubmissions: (teamMilestoneId: string) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/team-milestones/${teamMilestoneId}/submissions`) as Promise<MilestoneSubmission[]>,

  // Organizer review
  reviewTeamMilestone: (eventId: string, teamId: string, milestoneId: string, data: { status: 'approved' | 'rejected'; feedback?: string; points_earned: number }) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/events/${eventId}/teams/${teamId}/milestones/${milestoneId}/review`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<TeamMilestone>,

  listTeamMilestonesForOrganizer: (eventId: string, teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/events/${eventId}/teams/${teamId}/milestones`) as Promise<TeamMilestone[]>,

  // Reminders
  createReminder: (data: { team_milestone_id: string; reminder_type: 'due_soon' | 'overdue' | 'custom'; scheduled_for?: string; message?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/reminders`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<MilestoneReminder>,

  listTeamReminders: (teamId: string) =>
    fetchWithAuth(`${API_BASE_URL}/milestones/teams/${teamId}/reminders`) as Promise<MilestoneReminder[]>,
}

// Prizes API - Phase 6.4
export const prizesApi = {
  // Prize Categories
  createCategory: (eventId: string, data: { name: string; description?: string; rank?: number; is_special?: boolean; icon?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<PrizeCategory>,

  listCategories: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/categories`) as Promise<PrizeCategory[]>,

  updateCategory: (eventId: string, categoryId: string, data: Partial<{ name: string; description: string; rank: number; is_special: boolean; icon: string }>) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<PrizeCategory>,

  deleteCategory: (eventId: string, categoryId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/categories/${categoryId}`, { method: 'DELETE' }),

  // Prizes
  createPrize: (eventId: string, data: { name: string; category_id?: string; description?: string; prize_type: string; value?: number; currency?: string; image_url?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Prize>,

  listPrizes: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}`) as Promise<Prize[]>,

  getPrize: (prizeId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/${prizeId}`) as Promise<any>,

  updatePrize: (eventId: string, prizeId: string, data: Partial<{ name: string; description: string; prize_type: string; value: number; image_url: string }>) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/${prizeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Prize>,

  deletePrize: (eventId: string, prizeId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/${prizeId}`, { method: 'DELETE' }),

  // Prize Winners
  announceWinner: (prizeId: string, data: { team_id?: string; user_id?: string; rank: number }) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/${prizeId}/winners`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<PrizeWinner>,

  getPrizeWinners: (prizeId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/${prizeId}/winners`) as Promise<PrizeWinner[]>,

  getEventWinners: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/winners`) as Promise<any[]>,

  updateWinnerDistribution: (eventId: string, winnerId: string, data: { distribution_status: string; distribution_notes?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/winners/${winnerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<PrizeWinner>,

  removeWinner: (eventId: string, winnerId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/winners/${winnerId}`, { method: 'DELETE' }),

  // Prize Sponsors
  createSponsor: (eventId: string, data: { name: string; website_url?: string; logo_url?: string; tier?: string; contribution_description?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/sponsors`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<PrizeSponsor>,

  listSponsors: (eventId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/sponsors`) as Promise<PrizeSponsor[]>,

  deleteSponsor: (eventId: string, sponsorId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/events/${eventId}/sponsors/${sponsorId}`, { method: 'DELETE' }),

  // Prize Claims
  claimPrize: (winnerId: string) =>
    fetchWithAuth(`${API_BASE_URL}/prizes/winners/${winnerId}/claim`, { method: 'POST' }) as Promise<{ message: string; claim_token: string }>,
}

