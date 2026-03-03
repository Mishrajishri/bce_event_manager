
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const useSocket = (matchId?: string) => {
    const socketRef = useRef<Socket | null>(null)
    const queryClient = useQueryClient()

    useEffect(() => {
        // Initialize socket connection
        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
        })

        socketRef.current = socket

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id)
            if (matchId) {
                socket.emit('join_match', { match_id: matchId })
            }
        })

        socket.on('score_updated', (data) => {
            console.log('Score updated:', data)
            // Update the cache for the specific match
            queryClient.setQueryData(['match', data.id], data)
            // Also invalidate the matches list for the event
            queryClient.invalidateQueries({ queryKey: ['matches'] })
        })

        socket.on('new_commentary', (data) => {
            console.log('New commentary:', data)
            // Update commentary list cache
            queryClient.setQueryData(['commentary', data.match_id], (oldData: any[]) => {
                const newData = oldData ? [data, ...oldData] : [data]
                return newData
            })
        })

        socket.on('room_joined', (data) => {
            console.log('Joined room:', data.room)
        })

        return () => {
            if (matchId) {
                socket.emit('leave_match', { match_id: matchId })
            }
            socket.disconnect()
        }
    }, [matchId, queryClient])

    return socketRef.current
}
