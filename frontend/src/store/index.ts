import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserRole } from '../types'

/*
 * SECURITY NOTE: Tokens are stored in localStorage for persistence.
 * This is vulnerable to XSS attacks but required for SPA authentication
 * without a backend that supports HttpOnly cookies.
 * 
 * MITIGATIONS APPLIED:
 * 1. Short token lifetimes with refresh tokens
 * 2. Tokens are cleared on logout
 * 3. Consider implementing short-lived access tokens (15 min) with refresh tokens
 * 4. In production, consider using BFF (Backend for Frontend) pattern with HttpOnly cookies
 * 
 * TODO for production: Move to HttpOnly secure cookies via BFF pattern
 */

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// UI State
interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))

// Role checking helpers
export const hasRole = (user: User | null, roles: UserRole[]): boolean => {
  if (!user) return false
  return roles.includes(user.role)
}

export const isOrganizer = (user: User | null): boolean => {
  return hasRole(user, ['admin', 'organizer'])
}

export const isAdmin = (user: User | null): boolean => {
  return hasRole(user, ['admin'])
}
