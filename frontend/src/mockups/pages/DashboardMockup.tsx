import { Mail, TrendingUp, Users, Sparkles, ArrowRight } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Avatar, Badge, Button, Card, Stat } from '../../components/ui'
import { byId, leads, notifications, statuses, threads } from '../data'

/** DashboardMockup — KPIs, pipeline distribution, activity, inbox summary. */
export default function DashboardMockup() {
  const counts = statuses.map((s) => ({ s, n: leads.filter((l) => l.statusId === s.id).length }))
  const max = Math.max(...counts.map((c) => c.n))
  return (
    <MockupFrame name="dashboard" title="Dashboard">
      <AppShell active="dashboard" title="Dashboard" actions={<Button cmp="dashboard.range_button" size="sm">Last 30 days</Button>}>
        <div data-cmp="dashboard.root_div" className="p-5 flex flex-col gap-5">
          <div data-cmp="dashboard.stats_grid" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat cmp="dashboard.stat_leads" label="Open leads" value="37" delta="+6 this week" deltaTone="up" icon={<Users size={16} />} />
            <Stat cmp="dashboard.stat_winrate" label="Win rate" value="32%" delta="+4 pts" deltaTone="up" icon={<TrendingUp size={16} />} />
            <Stat cmp="dashboard.stat_replies" label="Awaiting reply" value="5" delta="2 drafts ready" deltaTone="flat" icon={<Mail size={16} />} />
            <Stat cmp="dashboard.stat_drafts" label="AI drafts accepted" value="68%" delta="−3 pts" deltaTone="down" icon={<Sparkles size={16} />} />
          </div>
          <div data-cmp="dashboard.main_grid" className="grid xl:grid-cols-3 gap-4">
            <Card cmp="dashboard.pipeline_card" title="Pipeline by status" className="xl:col-span-2">
              <div data-cmp="dashboard.pipeline_bars" className="flex flex-col gap-3">
                {counts.map(({ s, n }) => (
                  <div key={s.id} data-cmp={`dashboard.pipeline_row_${s.id}`} className="flex items-center gap-3 text-sm">
                    <span data-cmp={`dashboard.pipeline_label_${s.id}`} className="w-24 text-fg-muted">{s.name}</span>
                    <div data-cmp={`dashboard.pipeline_track_${s.id}`} className="flex-1 h-6 rounded bg-surface-2 overflow-hidden">
                      <div data-cmp={`dashboard.pipeline_fill_${s.id}`} className="h-full rounded transition-all" style={{ width: `${(n / max) * 100}%`, backgroundColor: s.color }} />
                    </div>
                    <span data-cmp={`dashboard.pipeline_count_${s.id}`} className="w-6 text-right font-mono">{n}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card cmp="dashboard.inbox_card" title="Needs a reply" actions={<Button cmp="dashboard.inbox_all_button" size="sm" variant="ghost" icon={<ArrowRight size={12} />}>Inbox</Button>} padded={false}>
              <ul data-cmp="dashboard.inbox_list" className="divide-y divide-border">
                {threads.filter((t) => t.unread).map((t) => {
                  const lead = t.leadId ? byId.lead(t.leadId) : undefined
                  return (
                    <li key={t.id} data-cmp={`dashboard.inbox_item_${t.id}`} className="p-3 flex gap-3 hover:bg-surface-2 cursor-pointer">
                      <Avatar cmp={`dashboard.inbox_avatar_${t.id}`} name={lead?.name ?? '?'} size="sm" />
                      <div data-cmp={`dashboard.inbox_meta_${t.id}`} className="min-w-0 flex-1">
                        <div data-cmp={`dashboard.inbox_top_${t.id}`} className="flex items-center justify-between gap-2"><span data-cmp={`dashboard.inbox_name_${t.id}`} className="text-sm font-medium truncate">{lead?.name}</span><span data-cmp={`dashboard.inbox_time_${t.id}`} className="text-[11px] text-fg-subtle">{t.lastAt}</span></div>
                        <p data-cmp={`dashboard.inbox_subject_${t.id}`} className="text-xs text-fg-muted truncate">{t.subject}</p>
                        {t.hasDraft && <Badge cmp={`dashboard.inbox_draft_${t.id}`} tone="accent" className="mt-1"><Sparkles size={10} /> Draft ready</Badge>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
            <Card cmp="dashboard.activity_card" title="Recent activity" className="xl:col-span-2" padded={false}>
              <ul data-cmp="dashboard.activity_list" className="divide-y divide-border">
                {notifications.map((n) => (
                  <li key={n.id} data-cmp={`dashboard.activity_item_${n.id}`} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                    <span data-cmp={`dashboard.activity_dot_${n.id}`} className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <span data-cmp={`dashboard.activity_title_${n.id}`} className="font-medium">{n.title}</span>
                    <span data-cmp={`dashboard.activity_body_${n.id}`} className="text-fg-muted truncate flex-1">{n.body}</span>
                    <span data-cmp={`dashboard.activity_time_${n.id}`} className="text-xs text-fg-subtle">{n.at}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card cmp="dashboard.hot_card" title="Hottest leads" padded={false}>
              <ul data-cmp="dashboard.hot_list" className="divide-y divide-border">
                {[...leads].sort((a, b) => b.score - a.score).slice(0, 5).map((l) => (
                  <li key={l.id} data-cmp={`dashboard.hot_item_${l.id}`} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                    <Avatar cmp={`dashboard.hot_avatar_${l.id}`} name={l.name} size="sm" />
                    <div data-cmp={`dashboard.hot_meta_${l.id}`} className="flex-1 min-w-0"><div data-cmp={`dashboard.hot_name_${l.id}`} className="font-medium truncate">{l.name}</div><div data-cmp={`dashboard.hot_company_${l.id}`} className="text-xs text-fg-muted truncate">{byId.company(l.companyId).name}</div></div>
                    <span data-cmp={`dashboard.hot_score_${l.id}`} className="font-mono text-xs text-accent">{l.score}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
