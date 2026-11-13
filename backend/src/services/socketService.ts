/** socketService — Socket.IO server; rooms per user and a workspace room. */
import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { CONSTANTS } from '../constants.ts'
import { verifyAccessToken } from '../middleware/auth.ts'

export type SocketEvent =
  | 'email:new' | 'email:updated' | 'email:event' | 'task:updated' | 'lead:updated' | 'lead:enriched' | 'company:enriched'
  | 'draft:ready' | 'knowledge:status' | 'notification:new' | 'account:status' | 'thread:scanned' | 'signing:updated'

let io: Server | null = null

export const socketService = {
  init(server: HttpServer) {
    io = new Server(server, { cors: { origin: CONSTANTS.FRONTEND_URL, credentials: true }, path: '/ws' })
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token as string | undefined
      if (!token) return next(new Error('unauthorized'))
      try {
        socket.data.user = verifyAccessToken(token)
        next()
      } catch {
        next(new Error('unauthorized'))
      }
    })
    io.on('connection', (socket) => {
      socket.join(`user:${socket.data.user.id}`)
      socket.join('workspace')
    })
    return io
  },
  toUser(userId: string, event: SocketEvent, payload: unknown) {
    io?.to(`user:${userId}`).emit(event, payload)
  },
  toAll(event: SocketEvent, payload: unknown) {
    io?.to('workspace').emit(event, payload)
  },
}
