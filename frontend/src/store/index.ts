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

// UI State — includes theme mode
interface UIState {
  sidebarOpen: boolean
  themeMode: 'light' | 'dark'
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleTheme: () => void
  setThemeMode: (mode: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      themeMode: 'light',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleTheme: () =>
        set((state) => ({
          themeMode: state.themeMode === 'light' ? 'dark' : 'light',
        })),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        themeMode: state.themeMode,
      }),
    }
  )
)

// Role checking helpers

/** Returns true if the user has any of the specified roles. */
export const hasRole = (user: User | null, roles: UserRole[]): boolean => {
  if (!user) return false
  return roles.includes(user.role)
}

/** True only for users with `super_admin` role — maps to backend `require_super_admin`. */
export const isSuperAdmin = (user: User | null): boolean => {
  return hasRole(user, ['super_admin'])
}

/** True for `super_admin` and `organizer` — maps to backend `require_organizer`. */
export const isOrganizer = (user: User | null): boolean => {
  return hasRole(user, ['super_admin', 'organizer'])
}

/** True for `super_admin` and `organizer` — maps to backend `require_admin`. */
export const isAdmin = (user: User | null): boolean => {
  return hasRole(user, ['super_admin', 'organizer'])
}
