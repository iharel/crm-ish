/** notificationService — persist a notification and push it over the socket. */
import { notificationRepository } from '../repositories/notificationRepository.ts'
import { socketService } from './socketService.ts'

export const notificationService = {
  notify(userId: string, d: { type: string; title: string; body?: string | null; link?: string | null }) {
    const n = notificationRepository.create({ user_id: userId, ...d })
    socketService.toUser(userId, 'notification:new', n)
    return n
  },
}
