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
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { accessToken } = useAuthStore.getState()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`
  }
  
  const response = await fetch(url, { ...options, headers })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
    throw new Error(error.detail || 'Request failed')
  }
  
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
