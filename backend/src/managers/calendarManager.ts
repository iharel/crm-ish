/** calendarManager — Google Calendar free/busy, slot proposal, event creation. */
import { badRequest } from '../middleware/errors.ts'
import { googleRepository } from '../repositories/googleRepository.ts'
import { leadRepository } from '../repositories/leadRepository.ts'
import { meetingRepository } from '../repositories/meetingRepository.ts'
import { userRepository } from '../repositories/userRepository.ts'
import { googleService } from '../services/googleService.ts'
import { notificationService } from '../services/notificationService.ts'
import { leadManager } from './leadManager.ts'

export interface Slot { start: string; end: string; label: string }

function fmt(d: Date, tz: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz }).format(d)
}

export const calendarManager = {
  async busy(userId: string, fromIso: string, toIso: string): Promise<{ start: string; end: string; title?: string }[]> {
    const acc = googleRepository.accountByUser(userId); if (!acc) return []
    const cal = googleService.calendar(acc)
    const res = await cal.events.list({ calendarId: acc.calendar_id || 'primary', timeMin: fromIso, timeMax: toIso, singleEvents: true, orderBy: 'startTime', maxResults: 250 })
    return (res.data.items ?? []).filter((e) => e.start?.dateTime && e.end?.dateTime && e.transparency !== 'transparent').map((e) => ({ start: e.start!.dateTime!, end: e.end!.dateTime!, title: e.summary ?? undefined }))
  },
  /** Propose N 30-minute slots within working hours over the next 7 business days, avoiding busy times. */
  async proposeSlots(userId: string, n = 3, durationMin = 30): Promise<Slot[]> {
    const user = userRepository.byId(userId); if (!user) return []
    const tz = user.timezone || 'UTC'
    const [sh, sm] = (user.working_hours_start || '09:00').split(':').map(Number)
    const [eh, em] = (user.working_hours_end || '17:00').split(':').map(Number)
    const now = new Date(); const from = new Date(now.getTime() + 2 * 3600000); const to = new Date(now.getTime() + 8 * 86400000)
    const busy = await this.busy(userId, from.toISOString(), to.toISOString()).catch(() => [] as { start: string; end: string }[])
    const slots: Slot[] = []
    for (let day = 0; day < 8 && slots.length < n; day++) {
      const base = new Date(from.getTime() + day * 86400000)
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(base)
      const wd = parts.find((p) => p.type === 'weekday')?.value
      if (wd === 'Sat' || wd === 'Sun') continue
      const y = parts.find((p) => p.type === 'year')!.value, mo = parts.find((p) => p.type === 'month')!.value, dd = parts.find((p) => p.type === 'day')!.value
      const offsetMin = tzOffsetMinutes(tz, base)
      for (let h = sh, m = sm; h * 60 + m + durationMin <= eh * 60 + em && slots.length < n; m += 60) {
        if (m >= 60) { h += 1; m -= 60 }
        const startUtc = new Date(Date.UTC(+y, +mo - 1, +dd, h, m) - offsetMin * 60000)
        const endUtc = new Date(startUtc.getTime() + durationMin * 60000)
        if (startUtc < from) continue
        const clash = busy.some((b) => new Date(b.start) < endUtc && new Date(b.end) > startUtc)
        if (clash) continue
        if (slots.some((s) => new Date(s.start).toDateString() === startUtc.toDateString() && slots.length >= 1 && n <= 2)) continue
        slots.push({ start: startUtc.toISOString(), end: endUtc.toISOString(), label: `${fmt(startUtc, tz)} (${tzAbbrev(tz, startUtc)})` })
        break
      }
    }
    return slots
  },
  async createMeeting(userId: string, d: { leadId?: string | null; title: string; start: string; end: string; attendees?: string[]; description?: string; meet?: boolean }) {
    const acc = googleRepository.accountByUser(userId); if (!acc) throw badRequest('Connect Google Calendar first')
    const lead = d.leadId ? leadRepository.byId(d.leadId) : undefined
    const attendees = [...(d.attendees ?? []), ...(lead?.email ? [lead.email] : [])].map((email) => ({ email }))
    const cal = googleService.calendar(acc)
    const res = await cal.events.insert({ calendarId: acc.calendar_id || 'primary', conferenceDataVersion: d.meet === false ? 0 : 1, sendUpdates: 'all', requestBody: { summary: d.title, description: d.description, start: { dateTime: d.start }, end: { dateTime: d.end }, attendees, conferenceData: d.meet === false ? undefined : { createRequest: { requestId: `crm-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } } } })
    const m = meetingRepository.create({ lead_id: lead?.id ?? null, user_id: userId, google_event_id: res.data.id ?? null, title: d.title, starts_at: d.start, ends_at: d.end, meet_link: res.data.hangoutLink ?? null })
    if (lead) leadManager.logActivity(lead.id, userId, 'meeting', { text: `Meeting booked: ${d.title}`, start: d.start, meetLink: m.meet_link })
    notificationService.notify(userId, { type: 'meeting', title: 'Meeting booked', body: `${d.title} — ${new Date(d.start).toLocaleString()}`, link: lead ? `/leads/${lead.id}` : '/calendar' })
    return m
  },
  async week(userId: string, fromIso: string, toIso: string) {
    const busy = await this.busy(userId, fromIso, toIso).catch(() => [])
    const meetings = meetingRepository.list(userId, fromIso)
    return { busy, meetings }
  },
  meetingsForLead(leadId: string) { return meetingRepository.forLead(leadId) },
}

function tzOffsetMinutes(tz: string, d: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d)
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'))
  return Math.round((asUtc - d.getTime()) / 60000)
}
function tzAbbrev(tz: string, d: Date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? tz
}
