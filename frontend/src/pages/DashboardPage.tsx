import { Link } from 'react-router-dom'
import { ArrowUpRight, Mail, Sparkles, TrendingUp, Users, Inbox } from 'lucide-react'
import { dashboardApi } from '../api'
import { AppShell } from '../components/shell/AppShell'
import { Hero } from '../components/common/Hero'
import { PageState } from '../components/common/PageState'
import { Avatar, Badge, Card } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { shortDate, timeAgo } from '../lib/format'

/** DashboardPage — KPIs, pipeline, inbox summary, activity. */
export default function DashboardPage() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync(() => dashboardApi.get())
  useSocketEvent('lead:updated', () => void reload(true)); useSocketEvent('email:new', () => void reload(true)); useSocketEvent('draft:ready', () => void reload(true))
  const hour = new Date().getHours(); const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const max = Math.max(1, ...(data?.byStatus.map((s) => s.count) ?? [1]))
  return (
    <AppShell title="Dashboard">
      <div data-cmp="dashboard.root_div" className="p-6 space-y-6 animate-fade-in">
        {loading || error ? <PageState cmp="dashboard" loading={loading} error={error} onRetry={() => void reload()} /> : data && (
          <>
            <Hero cmp="dashboard.hero" eyebrow={`${greet} · ${user?.name}`} title={<><span className="text-brand-gradient">{data.kpis.awaitingReply} conversations</span> are waiting for you.</>} subtitle={`${data.kpis.draftsReady} AI drafts are ready to review. ${data.kpis.newThisWeek} new leads came in this week.`}
              actions={<Link data-cmp="dashboard.hero_inbox_link" to="/inbox" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90"><Sparkles size={14} /> Open inbox</Link>}>
              <div data-cmp="dashboard.kpis" className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {[{ l: 'Open leads', v: data.kpis.openLeads, i: <Users size={15} /> }, { l: 'Win rate', v: `${data.kpis.winRate}%`, i: <TrendingUp size={15} /> }, { l: 'Awaiting reply', v: data.kpis.awaitingReply, i: <Mail size={15} /> }, { l: 'Draft acceptance', v: `${data.kpis.draftAcceptance}%`, i: <Sparkles size={15} /> }].map((k) => (
                  <div key={k.l} data-cmp={`dashboard.kpi_${k.l}`} className="card p-4 flex items-start justify-between"><div><div data-cmp={`dashboard.kpi_label_${k.l}`} className="text-xs text-fg-muted">{k.l}</div><div data-cmp={`dashboard.kpi_value_${k.l}`} className="mt-1 text-2xl font-semibold font-mono">{k.v}</div></div><span data-cmp={`dashboard.kpi_icon_${k.l}`} className="h-8 w-8 rounded-lg bg-brand-gradient text-white grid place-items-center">{k.i}</span></div>
                ))}
              </div>
            </Hero>
            <div data-cmp="dashboard.grid" className="grid lg:grid-cols-3 gap-5">
              <Card cmp="dashboard.pipeline_card" title="Pipeline by status" className="lg:col-span-2" actions={<Link data-cmp="dashboard.pipeline_link" to="/leads" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Board <ArrowUpRight size={12} /></Link>}>
                <div data-cmp="dashboard.pipeline_bars" className="flex flex-col gap-3">
                  {data.byStatus.map((s) => (
                    <div key={s.id} data-cmp={`dashboard.pipeline_row_${s.id}`} className="flex items-center gap-3 text-sm">
                      <span dir="auto" data-cmp={`dashboard.pipeline_label_${s.id}`} className="w-28 text-fg-muted truncate">{s.name}</span>
                      <div data-cmp={`dashboard.pipeline_track_${s.id}`} className="flex-1 h-6 rounded-md bg-surface-2 overflow-hidden"><div data-cmp={`dashboard.pipeline_fill_${s.id}`} className="h-full rounded-md transition-all" style={{ width: `${Math.max(2, (s.count / max) * 100)}%`, backgroundColor: s.color }} /></div>
                      <span data-cmp={`dashboard.pipeline_count_${s.id}`} className="w-6 text-right font-mono">{s.count}</span>
                    </div>
                  ))}
                  {!data.byStatus.length && <p data-cmp="dashboard.pipeline_empty" className="text-sm text-fg-muted">No statuses configured.</p>}
                </div>
              </Card>
              <Card cmp="dashboard.inbox_card" title="Needs a reply" padded={false} actions={<Link data-cmp="dashboard.inbox_link" to="/inbox" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Inbox <ArrowUpRight size={12} /></Link>}>
                <ul data-cmp="dashboard.inbox_list" className="divide-y divide-border">
                  {data.unreadThreads.map((t) => (
                    <li key={t.id} data-cmp={`dashboard.inbox_item_${t.id}`}><Link data-cmp={`dashboard.inbox_link_${t.id}`} to={`/inbox/${t.id}`} className="p-3 flex gap-3 hover:bg-surface-2">
                      <Avatar cmp={`dashboard.inbox_avatar_${t.id}`} name={t.leadName ?? t.counterpart?.name ?? t.counterpart?.email ?? '?'} size="sm" />
                      <div data-cmp={`dashboard.inbox_meta_${t.id}`} className="min-w-0 flex-1"><div data-cmp={`dashboard.inbox_top_${t.id}`} className="flex justify-between gap-2"><span dir="auto" data-cmp={`dashboard.inbox_name_${t.id}`} className="text-sm font-medium truncate">{t.leadName ?? t.counterpart?.name ?? t.counterpart?.email}</span><span data-cmp={`dashboard.inbox_time_${t.id}`} className="text-[11px] text-fg-subtle">{shortDate(t.lastMessageAt)}</span></div><p dir="auto" data-cmp={`dashboard.inbox_subject_${t.id}`} className="text-xs text-fg-muted truncate">{t.subject}</p>{t.hasDraft && <Badge cmp={`dashboard.inbox_draft_${t.id}`} tone="accent" className="mt-1"><Sparkles size={10} /> Draft ready</Badge>}</div>
                    </Link></li>
                  ))}
                  {!data.unreadThreads.length && <li data-cmp="dashboard.inbox_empty" className="p-6 text-center text-sm text-fg-muted flex flex-col items-center gap-2"><Inbox size={18} className="text-fg-subtle" />Inbox zero. Nice.</li>}
                </ul>
              </Card>
              <Card cmp="dashboard.activity_card" title="Recent activity" className="lg:col-span-2" padded={false}>
                <ul data-cmp="dashboard.activity_list" className="divide-y divide-border">
                  {data.activity.map((a) => (
                    <li key={a.id} data-cmp={`dashboard.activity_item_${a.id}`} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                      <span data-cmp={`dashboard.activity_dot_${a.id}`} className="h-2 w-2 rounded-full bg-brand-gradient shrink-0" />
                      <Link dir="auto" data-cmp={`dashboard.activity_lead_${a.id}`} to={`/leads/${a.leadId}`} className="font-medium hover:text-primary">{a.leadName}</Link>
                      <span data-cmp={`dashboard.activity_body_${a.id}`} className="text-fg-muted truncate flex-1">{activityText(a.type, a.payload)}</span>
                      <span data-cmp={`dashboard.activity_time_${a.id}`} className="text-xs text-fg-subtle">{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                  {!data.activity.length && <li data-cmp="dashboard.activity_empty" className="p-6 text-center text-sm text-fg-muted">No activity yet. Create your first lead.</li>}
                </ul>
              </Card>
              <Card cmp="dashboard.hot_card" title="Hottest leads" padded={false}>
                <ul data-cmp="dashboard.hot_list" className="divide-y divide-border">
                  {data.hottest.map((l) => (
                    <li key={l.id} data-cmp={`dashboard.hot_item_${l.id}`}><Link data-cmp={`dashboard.hot_link_${l.id}`} to={`/leads/${l.id}`} className="px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-surface-2"><Avatar cmp={`dashboard.hot_avatar_${l.id}`} name={l.name} size="sm" /><div data-cmp={`dashboard.hot_meta_${l.id}`} className="flex-1 min-w-0"><div dir="auto" data-cmp={`dashboard.hot_name_${l.id}`} className="font-medium truncate">{l.name}</div><div dir="auto" data-cmp={`dashboard.hot_company_${l.id}`} className="text-xs text-fg-muted truncate">{l.companyName ?? l.title ?? '—'}</div></div><span data-cmp={`dashboard.hot_score_${l.id}`} className="font-mono text-xs text-accent">{l.score}</span></Link></li>
                  ))}
                  {!data.hottest.length && <li data-cmp="dashboard.hot_empty" className="p-6 text-center text-sm text-fg-muted">No leads yet.</li>}
                </ul>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

export function activityText(type: string, p: Record<string, unknown>): string {
  switch (type) {
    case 'status_change': return `moved ${p.from ?? '—'} → ${p.to}${p.dealName ? ` (${p.dealName})` : ''}`
    case 'note': return `note: ${String(p.text ?? '').slice(0, 80)}`
    case 'email': return String(p.text ?? 'email')
    case 'meeting': return String(p.text ?? 'meeting')
    case 'enrichment': return 'enriched by AI'
    default: return String(p.text ?? type)
  }
}
