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
  MentorshipSlot,
  MentorshipBooking,
  MentorshipBookingCreate,
  OrganizerAnalytics,
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

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<any> {
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

  getAuditLogs: (params?: { action?: string; target_type?: string }) => {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return fetchWithAuth(`${API_BASE_URL}/admin/audit-logs${query ? `?${query}` : ''}`) as Promise<AuditLog[]>
  },

  getStats: () =>
    fetchWithAuth(`${API_BASE_URL}/admin/stats`) as Promise<PlatformStats>,

  exportUsersCSV: () => `${API_BASE_URL}/admin/export/users`,
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

// Organizer API (Organizers and above)
export const organizerApi = {
  getAnalytics: () =>
    fetchWithAuth(`${API_BASE_URL}/organizer/analytics`) as Promise<OrganizerAnalytics>,

  listEvents: () =>
    fetchWithAuth(`${API_BASE_URL}/organizer/events`) as Promise<Event[]>,
}

