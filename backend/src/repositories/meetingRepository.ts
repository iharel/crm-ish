/** meetingRepository — CRM meetings mirrored from Google Calendar events. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { MeetingRow } from '../types/index.ts'

export const meetingRepository = {
  list(userId: string, fromIso: string): MeetingRow[] { return all<MeetingRow>('SELECT * FROM meetings WHERE user_id = ? AND ends_at >= ? ORDER BY starts_at ASC', userId, fromIso) },
  forLead(leadId: string): MeetingRow[] { return all<MeetingRow>('SELECT * FROM meetings WHERE lead_id = ? ORDER BY starts_at DESC', leadId) },
  create(d: Omit<MeetingRow, 'id' | 'created_at' | 'status'>) {
    const id = nanoid(12)
    run('INSERT INTO meetings (id,lead_id,user_id,google_event_id,title,starts_at,ends_at,meet_link,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', id, d.lead_id, d.user_id, d.google_event_id, d.title, d.starts_at, d.ends_at, d.meet_link, 'scheduled', nowIso())
    return get<MeetingRow>('SELECT * FROM meetings WHERE id = ?', id)!
  },
}
