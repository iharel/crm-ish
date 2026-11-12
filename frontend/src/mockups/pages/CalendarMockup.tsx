import { Calendar, Link2, CheckCircle2, Video, Plus, Sparkles } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Avatar, Badge, Button, Card, Input, Toggle, cn } from '../../components/ui'

const days = ['Mon 20', 'Tue 21', 'Wed 22', 'Thu 23', 'Fri 24']
const hours = ['09', '10', '11', '12', '13', '14', '15', '16', '17']
const events: Record<string, { title: string; lead?: string; kind: 'crm' | 'busy' | 'slot' }> = {
  'Tue 21-14': { title: 'Pilot walkthrough · Sarah Cohen', lead: 'Sarah Cohen', kind: 'crm' },
  'Thu 23-10': { title: 'Proposed · David Park', lead: 'David Park', kind: 'slot' },
  'Mon 20-10': { title: 'Team sync', kind: 'busy' },
  'Wed 22-13': { title: 'Lunch', kind: 'busy' },
  'Fri 24-15': { title: 'Demo · Lukas Meyer', lead: 'Lukas Meyer', kind: 'crm' },
}

/** CalendarMockup — scheduling link, Google Calendar connection and week view. */
export default function CalendarMockup() {
  return (
    <MockupFrame name="calendar" title="Calendar & scheduling">
      <AppShell active="calendar" title="Calendar" actions={<><Badge cmp="calendar.connected_badge" tone="success"><CheckCircle2 size={10} /> Google Calendar connected</Badge><Button cmp="calendar.new_button" size="sm" variant="primary" icon={<Plus size={13} />}>New meeting</Button></>}>
        <div data-cmp="calendar.root_div" className="p-5 grid xl:grid-cols-[1fr_320px] gap-4 h-full">
          <Card cmp="calendar.week_card" title="Week of Oct 20" padded={false} className="min-h-0 overflow-hidden">
            <div data-cmp="calendar.week_grid" className="grid grid-cols-[48px_repeat(5,1fr)] text-xs h-full overflow-auto">
              <div data-cmp="calendar.corner" className="border-b border-r border-border bg-surface-2 sticky top-0" />
              {days.map((d) => <div key={d} data-cmp={`calendar.day_${d}`} className={cn('border-b border-r border-border bg-surface-2 px-2 py-2 font-medium sticky top-0', d === 'Tue 21' && 'text-primary')}>{d}</div>)}
              {hours.map((h) => (
                <div key={h} data-cmp={`calendar.hour_row_${h}`} className="contents">
                  <div data-cmp={`calendar.hour_${h}`} className="border-b border-r border-border px-1.5 py-1 text-fg-subtle font-mono h-14">{h}:00</div>
                  {days.map((d) => {
                    const ev = events[`${d}-${h}`]
                    return (
                      <div key={d} data-cmp={`calendar.cell_${d}_${h}`} className="border-b border-r border-border p-1 h-14">
                        {ev && <div data-cmp={`calendar.event_${d}_${h}`} className={cn('h-full rounded px-1.5 py-1 text-[11px] leading-tight truncate border', ev.kind === 'crm' && 'bg-primary/15 text-primary border-primary/30', ev.kind === 'busy' && 'bg-surface-3 text-fg-muted border-border', ev.kind === 'slot' && 'bg-accent/15 text-accent border-dashed border-accent/40')}>{ev.title}</div>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </Card>
          <div data-cmp="calendar.side" className="flex flex-col gap-4">
            <Card cmp="calendar.link_card" title="Scheduling link">
              <Input cmp="calendar.link_input" defaultValue="https://cal.com/alex/30" leading={<Link2 size={14} />} hint="The AI inserts this link into proposed replies." />
            </Card>
            <Card cmp="calendar.google_card" title="Google Calendar">
              <div data-cmp="calendar.google_row" className="flex items-center gap-3 text-sm"><Avatar cmp="calendar.google_avatar" name="Alex Morgan" size="sm" /><div className="flex-1"><p data-cmp="calendar.google_email" className="font-mono text-xs">alex@acme-demo.example</p><p data-cmp="calendar.google_status" className="text-xs text-success">Connected · read/write</p></div><Button cmp="calendar.google_disconnect_button" size="sm" variant="ghost">Disconnect</Button></div>
              <div data-cmp="calendar.google_opts" className="mt-3 flex flex-col gap-2 text-sm border-t border-border pt-3">
                <div data-cmp="calendar.opt_ai" className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Sparkles size={14} className="text-accent" /> AI may propose slots</span><Toggle cmp="calendar.opt_ai_toggle" checked /></div>
                <div data-cmp="calendar.opt_book" className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Calendar size={14} className="text-fg-muted" /> AI may book directly</span><Toggle cmp="calendar.opt_book_toggle" checked={false} /></div>
                <div data-cmp="calendar.opt_meet" className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Video size={14} className="text-fg-muted" /> Add Google Meet link</span><Toggle cmp="calendar.opt_meet_toggle" checked /></div>
              </div>
            </Card>
            <Card cmp="calendar.hours_card" title="Working hours">
              <div data-cmp="calendar.hours_row" className="flex items-center gap-2 text-sm"><Input cmp="calendar.hours_from" defaultValue="09:00" className="w-24 font-mono" /><span className="text-fg-muted">to</span><Input cmp="calendar.hours_to" defaultValue="17:00" className="w-24 font-mono" /><Badge cmp="calendar.tz_badge">America/New_York</Badge></div>
            </Card>
            <Card cmp="calendar.upcoming_card" title="Upcoming CRM meetings" padded={false}>
              <ul data-cmp="calendar.upcoming_list" className="divide-y divide-border text-sm">
                {[{ id: 'm1', who: 'Sarah Cohen', when: 'Tue 14:00', what: 'Pilot walkthrough' }, { id: 'm2', who: 'Lukas Meyer', when: 'Fri 15:00', what: 'Demo' }].map((m) => (
                  <li key={m.id} data-cmp={`calendar.upcoming_${m.id}`} className="p-3 flex items-center gap-3"><Avatar cmp={`calendar.upcoming_avatar_${m.id}`} name={m.who} size="sm" /><div className="flex-1"><p data-cmp={`calendar.upcoming_title_${m.id}`} className="font-medium">{m.what}</p><p data-cmp={`calendar.upcoming_meta_${m.id}`} className="text-xs text-fg-muted">{m.who} · {m.when}</p></div><Video size={14} className="text-fg-subtle" /></li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
