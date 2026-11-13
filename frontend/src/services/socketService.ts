/** socketService — Socket.IO client wrapper; one connection per session. */
import { io, type Socket } from 'socket.io-client'
import { CONSTANTS } from '../constants'
import { storageService } from './storageService'

export type SocketEvent = 'email:new' | 'email:updated' | 'email:event' | 'task:updated' | 'lead:updated' | 'lead:enriched' | 'company:enriched' | 'draft:ready' | 'knowledge:status' | 'notification:new' | 'account:status' | 'thread:scanned' | 'signing:updated'

let socket: Socket | null = null
const statusListeners = new Set<(connected: boolean) => void>()

export const socketService = {
  connect() {
    if (socket) return socket
    socket = io({ path: CONSTANTS.WS_PATH, auth: (cb) => cb({ token: storageService.getAccessToken() }), transports: ['websocket', 'polling'] })
    socket.on('connect', () => statusListeners.forEach((l) => l(true)))
    socket.on('disconnect', () => statusListeners.forEach((l) => l(false)))
    socket.on('connect_error', () => statusListeners.forEach((l) => l(false)))
    return socket
  },
  disconnect() { socket?.disconnect(); socket = null },
  on<T>(event: SocketEvent, handler: (payload: T) => void) {
    const s = this.connect(); s.on(event, handler as (p: unknown) => void)
    return () => { s.off(event, handler as (p: unknown) => void) }
  },
  onStatus(fn: (connected: boolean) => void) { statusListeners.add(fn); fn(!!socket?.connected); return () => { statusListeners.delete(fn) } },
  isConnected() { return !!socket?.connected },
}
