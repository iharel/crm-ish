/** notificationRepository — per-user notifications. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { NotificationRow } from '../types/index.ts'

export const notificationRepository = {
  list(userId: string, limit = 50): NotificationRow[] { return all<NotificationRow>('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', userId, limit) },
  unreadCount(userId: string) { return get<{ n: number }>('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL', userId)!.n },
  create(d: { user_id: string; type: string; title: string; body?: string | null; link?: string | null }) {
    const id = nanoid(12)
    run('INSERT INTO notifications (id,user_id,type,title,body,link,created_at) VALUES (?,?,?,?,?,?,?)', id, d.user_id, d.type, d.title, d.body ?? null, d.link ?? null, nowIso())
    return get<NotificationRow>('SELECT * FROM notifications WHERE id = ?', id)!
  },
  markRead(userId: string, id: string) { run('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?', nowIso(), id, userId) },
  markAllRead(userId: string) { run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', nowIso(), userId) },
}
