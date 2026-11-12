import { Eye, MousePointerClick, AlertTriangle, Send, Filter } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Avatar, Badge, Button, Card, Stat, Table, type Column } from '../../components/ui'

interface Row { id: string; to: string; lead: string; subject: string; sent: string; status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced'; opens: number; clicks: number }
const rows: Row[] = [
  { id: 'r1', to: 'sarah@northwind.health', lead: 'Sarah Cohen', subject: 'Proposal for Northwind pilot', sent: 'Yesterday 16:05', status: 'opened', opens: 2, clicks: 1 },
  { id: 'r2', to: 'rachel@northwind.health', lead: 'Rachel Gold', subject: 'Follow-up: webinar recording', sent: 'Sun 11:30', status: 'clicked', opens: 3, clicks: 2 },
  { id: 'r3', to: 'kate@oldcompany.com', lead: '—', subject: 'Quick intro', sent: 'Mon 08:00', status: 'bounced', opens: 0, clicks: 0 },
  { id: 'r4', to: 'a.keller@granitebank.com', lead: 'Anna Keller', subject: 'Nice meeting you at FinTech Week', sent: 'Oct 14', status: 'delivered', opens: 0, clicks: 0 },
  { id: 'r5', to: 'emma@brightline.law', lead: 'Emma Wright', subject: 'Intro — Acme Demo for legal intake', sent: 'Oct 13', status: 'sent', opens: 0, clicks: 0 },
]
const tone = { sent: 'neutral', delivered: 'info', opened: 'success', clicked: 'accent', bounced: 'danger' } as const
const icon = { sent: <Send size={10} />, delivered: <Send size={10} />, opened: <Eye size={10} />, clicked: <MousePointerClick size={10} />, bounced: <AlertTriangle size={10} /> }

/** TrackingMockup — email delivery, open, click and bounce analytics. */
export default function TrackingMockup() {
  const columns: Column<Row>[] = [
    { key: 'lead', header: 'Recipient', render: (r) => <div data-cmp={`tracking.recipient_${r.id}`} className="flex items-center gap-2"><Avatar cmp={`tracking.avatar_${r.id}`} name={r.lead === '—' ? r.to : r.lead} size="sm" /><div data-cmp={`tracking.recipient_meta_${r.id}`}><div data-cmp={`tracking.recipient_name_${r.id}`} className="font-medium">{r.lead}</div><div data-cmp={`tracking.recipient_addr_${r.id}`} className="text-xs text-fg-muted font-mono">{r.to}</div></div></div> },
    { key: 'subject', header: 'Subject', render: (r) => <span data-cmp={`tracking.subject_${r.id}`}>{r.subject}</span> },
    { key: 'sent', header: 'Sent', render: (r) => <span data-cmp={`tracking.sent_${r.id}`} className="text-xs text-fg-subtle">{r.sent}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge cmp={`tracking.status_${r.id}`} tone={tone[r.status]}>{icon[r.status]} {r.status}</Badge> },
    { key: 'opens', header: 'Opens', render: (r) => <span data-cmp={`tracking.opens_${r.id}`} className="font-mono">{r.opens}</span>, className: 'w-16' },
    { key: 'clicks', header: 'Clicks', render: (r) => <span data-cmp={`tracking.clicks_${r.id}`} className="font-mono">{r.clicks}</span>, className: 'w-16' },
  ]
  return (
    <MockupFrame name="tracking" title="Email tracking">
      <AppShell active="inbox" title="Email tracking" actions={<Button cmp="tracking.filter_button" size="sm" icon={<Filter size={13} />}>Last 30 days</Button>}>
        <div data-cmp="tracking.root_div" className="p-5 flex flex-col gap-4">
          <div data-cmp="tracking.stats" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat cmp="tracking.stat_sent" label="Sent" value="128" icon={<Send size={16} />} />
            <Stat cmp="tracking.stat_open" label="Open rate" value="61%" delta="+5 pts vs prev." deltaTone="up" icon={<Eye size={16} />} />
            <Stat cmp="tracking.stat_click" label="Click rate" value="23%" delta="flat" icon={<MousePointerClick size={16} />} />
            <Stat cmp="tracking.stat_bounce" label="Bounce rate" value="2.3%" delta="3 hard bounces" deltaTone="down" icon={<AlertTriangle size={16} />} />
          </div>
          <div data-cmp="tracking.grid" className="grid xl:grid-cols-3 gap-4">
            <Card cmp="tracking.table_card" title="Recent sends" className="xl:col-span-2" padded={false}><Table cmp="tracking.table" columns={columns} rows={rows} rowKey={(r) => r.id} /></Card>
            <Card cmp="tracking.events_card" title="Live events" padded={false}>
              <ul data-cmp="tracking.events_list" className="divide-y divide-border text-sm">
                {[
                  { id: 'e1', icon: <Eye size={12} />, text: 'Sarah Cohen opened "Proposal…"', meta: 'Boston, US · Gmail · 2m ago' },
                  { id: 'e2', icon: <MousePointerClick size={12} />, text: 'Rachel Gold clicked cal.com/maya', meta: 'Boston, US · Chrome · 1h ago' },
                  { id: 'e3', icon: <AlertTriangle size={12} />, text: 'Bounce: kate@oldcompany.com', meta: '550 address not found · Mon' },
                  { id: 'e4', icon: <Eye size={12} />, text: 'Sarah Cohen opened "Proposal…"', meta: 'Boston, US · iOS Mail · Yesterday' },
                ].map((e) => (
                  <li key={e.id} data-cmp={`tracking.event_${e.id}`} className="px-4 py-3 flex gap-3"><span data-cmp={`tracking.event_icon_${e.id}`} className="h-6 w-6 rounded-full bg-surface-3 text-fg-muted inline-flex items-center justify-center shrink-0">{e.icon}</span><div><p data-cmp={`tracking.event_text_${e.id}`}>{e.text}</p><p data-cmp={`tracking.event_meta_${e.id}`} className="text-xs text-fg-subtle">{e.meta}</p></div></li>
                ))}
              </ul>
            </Card>
          </div>
          <Card cmp="tracking.pixel_card" title="How tracking works">
            <div data-cmp="tracking.pixel_grid" className="grid md:grid-cols-3 gap-4 text-sm text-fg-muted">
              <div data-cmp="tracking.pixel_open"><p className="font-medium text-fg">Opens</p><p>A 1×1 image <code className="font-mono text-xs bg-surface-2 px-1 rounded">/t/o/:token.gif</code> is appended to outbound HTML.</p></div>
              <div data-cmp="tracking.pixel_click"><p className="font-medium text-fg">Clicks</p><p>Links are rewritten to <code className="font-mono text-xs bg-surface-2 px-1 rounded">/t/c/:token?u=…</code> which logs and redirects.</p></div>
              <div data-cmp="tracking.pixel_bounce"><p className="font-medium text-fg">Bounces</p><p>Gmail delivery-failure messages are parsed and matched to the original message id.</p></div>
            </div>
          </Card>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
