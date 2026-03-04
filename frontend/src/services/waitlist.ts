import { fetchWithAuth } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Waitlist Service
 * 
 * API client for waitlist management operations.
 * All methods return Promises that resolve to the API response data.
 */

export interface WaitlistEntry {
    id: string;
    waitlist_position: number;
    waitlisted_at: string;
    users: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
    };
}

export interface WaitlistStats {
    count: number;
    max_position: number;
    avg_wait_time_hours: number;
}

export interface WaitlistHistoryEntry {
    id: string;
    action: 'added' | 'promoted' | 'cancelled' | 'removed';
    old_position?: number;
    new_position?: number;
    notes?: string;
    created_at: string;
    registrations?: {
        id: string;
        user_id: string;
        users: {
            first_name: string;
            last_name: string;
            email: string;
        };
    };
}

export interface MyWaitlistDetails {
    on_waitlist: boolean;
    position: number | null;
    total_on_waitlist?: number;
    wait_time_hours?: number;
    waitlisted_at?: string;
}

export const waitlistService = {
    /**
     * Get current user's waitlist position for an event
     * @param eventId - The event UUID
     * @returns Waitlist position (1-indexed) or null
     */
    getPosition: (eventId: string): Promise<number | null> =>
        fetchWithAuth(`${API_BASE_URL}/waitlist/position/${eventId}`),

    /**
     * Get detailed waitlist information for current user
     * @param eventId - The event UUID
     * @returns Detailed waitlist status including position and wait time
     */
    getMyDetails: (eventId: string): Promise<MyWaitlistDetails> =>
        fetchWithAuth(`${API_BASE_URL}/waitlist/my-position/${eventId}`),

    /**
     * Get full waitlist for an event (organizer only)
     * @param eventId - The event UUID
     * @returns Array of waitlisted registrations with user details
     */
    getEventWaitlist: (eventId: string): Promise<WaitlistEntry[]> =>
        fetchWithAuth(`${API_BASE_URL}/waitlist/event/${eventId}`),

    /**
     * Manually promote first person from waitlist (organizer only)
     * @param eventId - The event UUID
     * @returns Success message and promoted registration
     */
    promoteFromWaitlist: (eventId: string): Promise<{
        success: boolean;
        message: string;
        registration: Record<string, unknown>;
    }> =>
        fetchWithAuth(`${API_BASE_URL}/waitlist/promote/${eventId}`, { method: 'POST' }),

    /**
     * Get waitlist statistics for an event (organizer only)
     * @param eventId - The event UUID
     * @returns Waitlist stats including count and avg wait time
     */
    getStats: (eventId: string): Promise<WaitlistStats> =>
        fetchWithAuth(`${API_BASE_URL}/waitlist/stats/${eventId}`),

    /**
     * Get waitlist history/audit trail (organizer only)
     * @param eventId - The event UUID
     * @returns Array of waitlist history entries
     */
    getHistory: (eventId: string): Promise<WaitlistHistoryEntry[]> =>
        fetchWithAuth(`${API_BASE_URL}/waitlist/history/${eventId}`),
};

export default waitlistService;
