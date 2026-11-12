import { Link } from 'react-router-dom'
import { Eye, MousePointerClick, AlertTriangle, Send } from 'lucide-react'
import { trackingApi } from '../api'
import { AppShell } from '../components/shell/AppShell'
import { PageState } from '../components/common/PageState'
import { Avatar, Badge, Card, Stat, Table, type Column } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { emailOnly, fullDate, timeAgo } from '../lib/format'
import type { TrackingOverview } from '../types'

type Row = TrackingOverview['messages'][number]
const tone = { sent: 'neutral', received: 'neutral', delivered: 'info', opened: 'success', clicked: 'accent', bounced: 'danger' } as const
const icon: Record<string, React.ReactNode> = { open: <Eye size={12} />, click: <MousePointerClick size={12} />, bounce: <AlertTriangle size={12} /> }

/** TrackingPage — delivery, open, click and bounce analytics. */
export default function TrackingPage() {
  const { data, loading, error, reload } = useAsync(() => trackingApi.overview(30))
  useSocketEvent('email:event', () => void reload(true)); useSocketEvent('email:new', () => void reload(true))
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '0%')
  const columns: Column<Row>[] = [
    { key: 'lead', header: 'Recipient', render: (r) => <div data-cmp={`tracking.recipient_${r.id}`} className="flex items-center gap-2"><Avatar cmp={`tracking.avatar_${r.id}`} name={r.leadName ?? emailOnly(r.to[0] ?? '?')} size="sm" /><div data-cmp={`tracking.recipient_meta_${r.id}`}><div data-cmp={`tracking.recipient_name_${r.id}`} className="font-medium">{r.leadId ? <Link dir="auto" to={`/leads/${r.leadId}`} className="hover:text-primary">{r.leadName}</Link> : '—'}</div><div data-cmp={`tracking.recipient_addr_${r.id}`} className="text-xs text-fg-muted font-mono">{emailOnly(r.to[0] ?? '')}</div></div></div> },
    { key: 'subject', header: 'Subject', render: (r) => <Link dir="auto" data-cmp={`tracking.subject_${r.id}`} to={`/inbox/${r.threadId}`} className="hover:text-primary">{r.subject}</Link> },
    { key: 'sent', header: 'Sent', render: (r) => <span data-cmp={`tracking.sent_${r.id}`} className="text-xs text-fg-subtle">{fullDate(r.sentAt)}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge cmp={`tracking.status_${r.id}`} tone={tone[r.status as keyof typeof tone] ?? 'neutral'}>{r.status}</Badge> },
    { key: 'opens', header: 'Opens', render: (r) => <span data-cmp={`tracking.opens_${r.id}`} className="font-mono">{r.opens}</span>, className: 'w-16' },
    { key: 'clicks', header: 'Clicks', render: (r) => <span data-cmp={`tracking.clicks_${r.id}`} className="font-mono">{r.clicks}</span>, className: 'w-16' },
  ]
  return (
    <AppShell title="Email tracking">
      <div data-cmp="tracking.root_div" className="p-6 space-y-5 animate-fade-in">
        {loading && !data ? <PageState cmp="tracking" loading /> : error ? <PageState cmp="tracking" error={error} onRetry={() => void reload()} /> : data && (
          <>
            <div data-cmp="tracking.stats" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <Stat cmp="tracking.stat_sent" label="Sent (30d)" value={String(data.stats.sent)} icon={<Send size={16} />} />
              <Stat cmp="tracking.stat_open" label="Open rate" value={pct(data.stats.opened, data.stats.sent)} delta={`${data.stats.opened} opened`} icon={<Eye size={16} />} />
              <Stat cmp="tracking.stat_click" label="Click rate" value={pct(data.stats.clicked, data.stats.sent)} delta={`${data.stats.clicked} clicked`} icon={<MousePointerClick size={16} />} />
              <Stat cmp="tracking.stat_bounce" label="Bounce rate" value={pct(data.stats.bounced, data.stats.sent)} delta={`${data.stats.bounced} bounced`} deltaTone={data.stats.bounced ? 'down' : 'flat'} icon={<AlertTriangle size={16} />} />
            </div>
            <div data-cmp="tracking.grid" className="grid xl:grid-cols-3 gap-5">
              <Card cmp="tracking.table_card" title="Recent sends" className="xl:col-span-2" padded={false}><Table cmp="tracking.table" columns={columns} rows={data.messages} rowKey={(r) => r.id} />{!data.messages.length && <p data-cmp="tracking.table_empty" className="p-8 text-center text-sm text-fg-muted">No tracked emails yet. Send one from the Inbox.</p>}</Card>
              <Card cmp="tracking.events_card" title="Live events" padded={false}>
                <ul data-cmp="tracking.events_list" className="divide-y divide-border text-sm">
                  {data.events.map((e) => <li key={e.id} data-cmp={`tracking.event_${e.id}`} className="px-4 py-3 flex gap-3"><span data-cmp={`tracking.event_icon_${e.id}`} className="h-6 w-6 rounded-full bg-surface-3 text-fg-muted grid place-items-center shrink-0">{icon[e.type]}</span><div data-cmp={`tracking.event_meta_${e.id}`} className="min-w-0"><p dir="auto" data-cmp={`tracking.event_text_${e.id}`} className="truncate">{e.who ?? 'Someone'} {e.type === 'open' ? 'opened' : e.type === 'click' ? 'clicked a link in' : 'bounced'} “{e.subject}”</p><p data-cmp={`tracking.event_time_${e.id}`} className="text-xs text-fg-subtle truncate">{timeAgo(e.createdAt)}{e.url ? ` · ${e.url}` : ''}</p></div></li>)}
                  {!data.events.length && <li data-cmp="tracking.events_empty" className="p-6 text-sm text-fg-muted text-center">No events yet.</li>}
                </ul>
              </Card>
            </div>
            <Card cmp="tracking.how_card" title="How tracking works">
              <div data-cmp="tracking.how_grid" className="grid md:grid-cols-3 gap-4 text-sm text-fg-muted">
                <div data-cmp="tracking.how_open"><p className="font-medium text-fg">Opens</p><p>A 1×1 pixel is appended to outbound HTML. Some clients block images, so opens undercount.</p></div>
                <div data-cmp="tracking.how_click"><p className="font-medium text-fg">Clicks</p><p>Links are rewritten through a redirect that logs the click and forwards to the original URL.</p></div>
                <div data-cmp="tracking.how_bounce"><p className="font-medium text-fg">Bounces</p><p>Gmail delivery-failure messages are parsed and matched to the original message.</p></div>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
