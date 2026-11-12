import { useMemo, useState } from 'react'
import { safeUrl } from '../lib/safeUrl'
import { Link } from 'react-router-dom'
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Plus, Video, Link2 } from 'lucide-react'
import { calendarApi } from '../api'
import { AppShell } from '../components/shell/AppShell'
import { PageState } from '../components/common/PageState'
import { MeetingModal } from '../components/email/MeetingModal'
import { Badge, Button, Card, cn } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { fullDate } from '../lib/format'

function startOfWeek(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const DAY_START = 8
const HOURS = Array.from({ length: 11 }, (_, i) => DAY_START + i)
const DAY_END = DAY_START + HOURS.length
/** Pixel height of one hour row (matches the `h-14` hour cells). */
const HOUR_PX = 56

interface CalItem { start: Date; end: Date; title: string; kind: 'busy' | 'crm'; link: string | null }
interface Placed extends CalItem { top: number; height: number; col: number; cols: number }

/** Position a day's events: top/height from time, and side-by-side columns for overlapping items. */
function layoutDay(day: Date, items: CalItem[]): Placed[] {
  const dayStart = new Date(day); dayStart.setHours(DAY_START, 0, 0, 0)
  const dayEnd = new Date(day); dayEnd.setHours(DAY_END, 0, 0, 0)
  const todays = items.filter((e) => e.start < dayEnd && e.end > dayStart).sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime())
  const placed: Placed[] = []
  // Greedy column assignment within clusters of mutually overlapping events.
  let cluster: Placed[] = []; let clusterEnd = 0
  const flush = () => { const cols = Math.max(1, ...cluster.map((c) => c.col + 1)); cluster.forEach((c) => { c.cols = cols }); cluster = [] }
  for (const e of todays) {
    const s = Math.max(e.start.getTime(), dayStart.getTime()); const en = Math.min(e.end.getTime(), dayEnd.getTime())
    const top = ((s - dayStart.getTime()) / 3600000) * HOUR_PX
    const height = Math.max(18, ((en - s) / 3600000) * HOUR_PX)
    if (cluster.length && s >= clusterEnd) flush()
    const taken = new Set(cluster.filter((c) => c.end.getTime() > s).map((c) => c.col))
    let col = 0; while (taken.has(col)) col++
    const p: Placed = { ...e, top, height, col, cols: 1 }
    cluster.push(p); placed.push(p); clusterEnd = Math.max(clusterEnd, en)
  }
  flush()
  return placed
}

/** CalendarPage — week view of Google Calendar busy blocks and CRM meetings. */
export default function CalendarPage() {
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [book, setBook] = useState(false)
  const from = weekStart.toISOString(); const to = new Date(weekStart.getTime() + 7 * 86400000).toISOString()
  const { data, loading, error, reload } = useAsync(() => calendarApi.week(from, to), [from])
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => new Date(weekStart.getTime() + i * 86400000)), [weekStart])
  const items = useMemo<CalItem[]>(() => [
    ...(data?.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end), title: b.title ?? 'Busy', kind: 'busy' as const, link: null as string | null })),
    ...(data?.meetings ?? []).map((m) => ({ start: new Date(m.starts_at), end: new Date(m.ends_at), title: m.title, kind: 'crm' as const, link: m.lead_id ? `/leads/${m.lead_id}` : null })),
  ], [data])
  const byDay = useMemo(() => days.map((d) => layoutDay(d, items)), [days, items])
  const now = new Date()
  return (
    <AppShell title="Calendar" actions={<>{user?.gmail ? <Badge cmp="calendar.connected_badge" tone="success"><CheckCircle2 size={10} /> Google Calendar</Badge> : <Link data-cmp="calendar.connect_link" to="/settings"><Badge cmp="calendar.connect_badge" tone="warning">Connect Google</Badge></Link>}<Button cmp="calendar.new_button" size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setBook(true)}>New meeting</Button></>}>
      <div data-cmp="calendar.root_div" className="p-6 grid xl:grid-cols-[1fr_320px] gap-5 h-full animate-fade-in">
        <Card cmp="calendar.week_card" padded={false} className="min-h-0 overflow-hidden" title={<span className="inline-flex items-center gap-2"><Button cmp="calendar.prev_button" size="icon" variant="ghost" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}><ChevronLeft size={14} /></Button>{weekStart.toLocaleDateString([], { month: 'long', day: 'numeric' })} – {new Date(weekStart.getTime() + 4 * 86400000).toLocaleDateString([], { month: 'short', day: 'numeric' })}<Button cmp="calendar.next_button" size="icon" variant="ghost" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}><ChevronRight size={14} /></Button></span>} actions={<Button cmp="calendar.today_button" size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>}>
          {error ? <PageState cmp="calendar" error={error} onRetry={() => void reload()} /> : (
            <div data-cmp="calendar.week_grid" className={cn('grid grid-cols-[52px_repeat(5,1fr)] auto-rows-max content-start text-xs h-full overflow-auto', loading && 'opacity-60')}>
              <div data-cmp="calendar.corner" className="border-b border-r border-border bg-surface-2 sticky top-0 z-10" />
              {days.map((d) => <div key={d.toISOString()} data-cmp={`calendar.day_${d.getDate()}`} className={cn('border-b border-r border-border bg-surface-2 px-2 py-2 font-medium sticky top-0 z-10', d.toDateString() === now.toDateString() && 'text-primary')}>{d.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}</div>)}
              <div data-cmp="calendar.hours_col" className="border-r border-border">
                {HOURS.map((h) => <div key={h} data-cmp={`calendar.hour_${h}`} className="border-b border-border px-1.5 py-1 text-fg-subtle font-mono h-14">{String(h).padStart(2, '0')}:00</div>)}
              </div>
              {days.map((d, di) => (
                <div key={d.toISOString()} data-cmp={`calendar.day_col_${d.getDate()}`} className="relative border-r border-border" style={{ height: HOURS.length * HOUR_PX }}>
                  {HOURS.map((h) => <div key={h} data-cmp={`calendar.cell_${d.getDate()}_${h}`} className="border-b border-border h-14" />)}
                  {byDay[di].map((e, i) => {
                    const width = 100 / e.cols
                    const el = (
                      <div data-cmp={`calendar.event_${d.getDate()}_${i}`} className={cn('absolute rounded-md px-1.5 py-0.5 text-[11px] leading-tight border overflow-hidden', e.kind === 'crm' ? 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25' : 'bg-surface-3 text-fg-muted border-border')} style={{ top: e.top + 1, height: e.height - 2, left: `calc(${e.col * width}% + 2px)`, width: `calc(${width}% - 4px)` }} title={`${e.title} · ${fullDate(e.start.toISOString())} – ${e.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
                        {e.height < 40
                          ? <p data-cmp={`calendar.event_line_${d.getDate()}_${i}`} className="truncate"><span className="font-mono opacity-80">{e.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> <span dir="auto" className="font-medium">{e.title}</span></p>
                          : <>
                            <p data-cmp={`calendar.event_time_${d.getDate()}_${i}`} className="font-mono opacity-80 truncate">{e.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–{e.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p dir="auto" data-cmp={`calendar.event_title_${d.getDate()}_${i}`} className="font-medium truncate">{e.title}</p>
                          </>}
                      </div>
                    )
                    return e.link ? <Link key={i} to={e.link}>{el}</Link> : <div key={i}>{el}</div>
                  })}
                </div>
              ))}
            </div>
          )}
        </Card>
        <div data-cmp="calendar.side" className="flex flex-col gap-5">
          <Card cmp="calendar.link_card" title="Scheduling link">
            {user?.schedulingLink ? <a data-cmp="calendar.link_value" href={safeUrl(user.schedulingLink)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-mono text-primary hover:underline break-all"><Link2 size={14} /> {user.schedulingLink}</a> : <p data-cmp="calendar.link_empty" className="text-sm text-fg-muted">No link set. <Link to="/settings" className="text-primary">Add it in Settings</Link> so the AI can include it in replies.</p>}
          </Card>
          <Card cmp="calendar.upcoming_card" title="Upcoming CRM meetings" padded={false}>
            <ul data-cmp="calendar.upcoming_list" className="divide-y divide-border text-sm">
              {(data?.meetings ?? []).filter((m) => new Date(m.ends_at) >= now).slice(0, 8).map((m) => <li key={m.id} data-cmp={`calendar.upcoming_${m.id}`} className="p-3 flex items-center gap-3"><span data-cmp={`calendar.upcoming_icon_${m.id}`} className="h-8 w-8 rounded-lg bg-primary/12 text-primary grid place-items-center"><Calendar size={14} /></span><div data-cmp={`calendar.upcoming_meta_${m.id}`} className="flex-1 min-w-0"><p dir="auto" data-cmp={`calendar.upcoming_title_${m.id}`} className="font-medium truncate">{m.title}</p><p data-cmp={`calendar.upcoming_time_${m.id}`} className="text-xs text-fg-muted">{fullDate(m.starts_at)}</p></div>{m.meet_link && <a data-cmp={`calendar.upcoming_meet_${m.id}`} href={m.meet_link} target="_blank" rel="noreferrer" className="text-fg-subtle hover:text-fg"><Video size={14} /></a>}</li>)}
              {data && !data.meetings.length && <li data-cmp="calendar.upcoming_empty" className="p-4 text-sm text-fg-muted">No CRM meetings this week.</li>}
            </ul>
          </Card>
        </div>
      </div>
      {book && <MeetingModal leadId={null} onClose={() => setBook(false)} onBooked={() => { setBook(false); void reload(true) }} />}
    </AppShell>
  )
}
