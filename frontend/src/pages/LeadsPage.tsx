import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Filter, LayoutList, Kanban, Plus, Sparkles, Mail, GripVertical, ExternalLink, ArrowRightLeft, Trash2, Archive, ArchiveRestore, Upload, Handshake, Users } from 'lucide-react'
import { dealsApi, leadsApi, statusesApi, usersApi } from '../api'
import { errorMessage } from '../api/apiError'
import { AppShell } from '../components/shell/AppShell'
import { PageState } from '../components/common/PageState'
import { StatusBadge } from '../components/common/StatusBadge'
import { LeadFormModal } from '../components/leads/LeadFormModal'
import { DealsBoard } from '../components/deals/DealsBoard'
import { ImportLeadsModal } from '../components/leads/ImportLeadsModal'
import { Avatar, Badge, Button, Input, Select, Table, cn, type Column } from '../components/ui'
import { useToast } from '../contexts/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { useContextMenu } from '../hooks/useContextMenu'
import { ContextMenu } from '../components/common/ContextMenu'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { storageService } from '../services/storageService'
import { timeAgo } from '../lib/format'
import type { Lead, LeadDeal } from '../types'

/** One Kanban card: a lead, shown once per deal when its company was split into several deals. */
interface PipelineCard { key: string; lead: Lead; deal: LeadDeal | null; statusId: string | null }
const cardsOf = (l: Lead): PipelineCard[] => (l.multiDeal && l.deals.length ? l.deals.map((d) => ({ key: `${l.id}_${d.id}`, lead: l, deal: d, statusId: d.statusId })) : [{ key: l.id, lead: l, deal: null, statusId: l.statusId }])

/**
 * LeadsPage — the pipeline as Leads (one card per person) or Deals (one card per deal, titled with the company),
 * each as Kanban (drag & drop between statuses) or List.
 * The status belongs to the lead's deal: moving a lead moves every lead of the same deal with it.
 */
export default function LeadsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  // The chosen view lives in the URL (survives a reload even where browser storage is blocked) and in the saved prefs (used when arriving without it).
  const [prefView, setPrefView] = useState<'kanban' | 'list'>(() => storageService.getPref('leadsView', 'kanban'))
  const [prefMode, setPrefMode] = useState<'leads' | 'deals'>(() => storageService.getPref('leadsMode', 'leads'))
  const urlView = params.get('layout'); const urlMode = params.get('view')
  const view: 'kanban' | 'list' = urlView === 'kanban' || urlView === 'list' ? urlView : prefView
  const mode: 'leads' | 'deals' = urlMode === 'leads' || urlMode === 'deals' ? urlMode : prefMode
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStatus, setOverStatus] = useState<string | null>(null)
  const q = params.get('q') ?? ''; const statusId = params.get('status') ?? ''; const ownerId = params.get('owner') ?? ''
  const statuses = useAsync(() => statusesApi.list())
  const users = useAsync(() => usersApi.list())
  const archived = params.get('archived') === '1'
  const leads = useAsync(() => leadsApi.list({ q: q || undefined, statusId: statusId || undefined, ownerId: ownerId || undefined, archived: archived ? 'true' : undefined }), [q, statusId, ownerId, archived])
  const deals = useAsync(() => (mode === 'deals' ? dealsApi.list({ q: q || undefined, statusId: statusId || undefined, ownerId: ownerId || undefined, archived: archived ? 'true' : undefined }) : Promise.resolve([])), [mode, q, statusId, ownerId, archived])
  useSocketEvent('lead:updated', () => { void leads.reload(true); void statuses.reload(true); void deals.reload(true) })
  useSocketEvent('lead:enriched', () => void leads.reload(true))
  const setParam = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p) }
  const setMode2 = (m: 'leads' | 'deals') => { setPrefMode(m); storageService.setPref('leadsMode', m); const p = new URLSearchParams(params); p.set('view', m); setParams(p, { replace: true }) }
  const setView2 = (v: 'kanban' | 'list') => { setPrefView(v); storageService.setPref('leadsView', v); const p = new URLSearchParams(params); p.set('layout', v); setParams(p, { replace: true }) }

  const ctx = useContextMenu<PipelineCard>()
  const cards = useMemo(() => (leads.data ?? []).flatMap(cardsOf), [leads.data])
  async function removeLead(l: Lead) { if (!confirm(`Delete ${l.name}? Linked emails stay in the inbox.`)) return; try { await leadsApi.remove(l.id); leads.setData((d) => d?.filter((x) => x.id !== l.id) ?? d); toast.success('Lead deleted') } catch (e) { toast.error(errorMessage(e)) } }
  async function archiveLead(l: Lead) { try { const u = await leadsApi.archive(l.id, !l.archivedAt); leads.setData((d) => d?.filter((x) => x.id !== l.id) ?? d); toast.success(u.archivedAt ? 'Lead archived' : 'Lead restored') } catch (e) { toast.error(errorMessage(e)) } }
  async function enrichLead(l: Lead) { try { const u = await leadsApi.enrich(l.id); leads.setData((d) => d?.map((x) => (x.id === l.id ? u : x)) ?? d); toast.success('Lead enriched') } catch (e) { toast.error(errorMessage(e)) } }

  async function move(c: PipelineCard, toStatus: string) {
    if (c.statusId === toStatus) return
    const dealId = c.deal?.id ?? c.lead.deals[0]?.id
    // Optimistic: every lead of the moved deal follows; a lead without a company moves alone.
    leads.setData((d) => d?.map((x) => {
      if (!dealId) return x.id === c.lead.id ? { ...x, statusId: toStatus } : x
      if (!x.deals.some((y) => y.id === dealId)) return x
      const deals = x.deals.map((y) => (y.id === dealId ? { ...y, statusId: toStatus } : y))
      return { ...x, deals, statusId: deals[0].statusId }
    }) ?? d)
    try { await leadsApi.move(c.lead.id, toStatus, dealId) } catch (e) { toast.error(errorMessage(e)); void leads.reload(true) }
  }

  const columns: Column<Lead>[] = useMemo(() => [
    { key: 'name', header: 'Lead', render: (l) => <div data-cmp={`leads.list_name_${l.id}`} className="flex items-center gap-2"><Avatar cmp={`leads.list_avatar_${l.id}`} name={l.name} size="sm" /><div data-cmp={`leads.list_meta_${l.id}`}><div dir="auto" data-cmp={`leads.list_fullname_${l.id}`} className="font-medium">{l.name}</div><div data-cmp={`leads.list_email_${l.id}`} className="text-xs text-fg-muted font-mono">{l.email ?? '—'}</div></div></div> },
    { key: 'title', header: 'Title', render: (l) => <span dir="auto" data-cmp={`leads.list_title_${l.id}`} className="text-fg-muted">{l.title ?? '—'}</span> },
    { key: 'company', header: 'Company', render: (l) => <span dir="auto" data-cmp={`leads.list_company_${l.id}`}>{l.companyName ?? '—'}{l.supplier && <span data-cmp={`leads.list_supplier_${l.id}`} className="ml-1.5 rounded-full bg-warning/15 text-warning px-1.5 py-0.5 text-[10px] font-medium">Supplier</span>}</span> },
    { key: 'status', header: 'Status', render: (l) => l.multiDeal ? <div data-cmp={`leads.list_deals_${l.id}`} className="flex flex-col gap-1">{l.deals.map((d) => <span key={d.id} data-cmp={`leads.list_deal_${l.id}_${d.id}`} className="inline-flex items-center gap-1.5"><StatusBadge cmp={`leads.list_status_${l.id}_${d.id}`} status={statuses.data?.find((s) => s.id === d.statusId)} /><span dir="auto" data-cmp={`leads.list_deal_name_${l.id}_${d.id}`} className="text-xs text-fg-muted truncate">{d.name}</span></span>)}</div> : <StatusBadge cmp={`leads.list_status_${l.id}`} status={statuses.data?.find((s) => s.id === l.statusId)} /> },
    { key: 'score', header: 'Score', render: (l) => <span data-cmp={`leads.list_score_${l.id}`} className="font-mono text-accent">{l.score}</span>, className: 'w-16' },
    { key: 'source', header: 'Source', render: (l) => <span data-cmp={`leads.list_source_${l.id}`} className="text-fg-muted">{l.source ?? '—'}</span> },
    { key: 'owner', header: 'Owner', render: (l) => l.ownerName ? <Avatar cmp={`leads.list_owner_${l.id}`} name={l.ownerName} size="xs" /> : <span data-cmp={`leads.list_owner_${l.id}`}>—</span> },
    { key: 'ai', header: 'AI', render: (l) => l.enrichedAt ? <Sparkles data-cmp={`leads.list_enriched_${l.id}`} size={14} className="text-accent" /> : <span data-cmp={`leads.list_enriched_${l.id}`} className="text-fg-subtle">—</span>, className: 'w-10' },
    { key: 'activity', header: 'Last activity', render: (l) => <span data-cmp={`leads.list_activity_${l.id}`} className="text-fg-subtle text-xs">{timeAgo(l.lastActivityAt)}</span> },
  ], [statuses.data])

  return (
    <AppShell title="Leads" actions={
      <>
        <div data-cmp="leads.mode_switch" className="inline-flex rounded-lg border border-border overflow-hidden">
          <button data-cmp="leads.mode_leads_button" aria-pressed={mode === 'leads'} onClick={() => setMode2('leads')} className={cn('h-8 px-2.5 inline-flex items-center gap-1.5 text-xs', mode === 'leads' ? 'bg-primary/12 text-primary' : 'text-fg-muted hover:bg-surface-2')}><Users size={13} /> Leads</button>
          <button data-cmp="leads.mode_deals_button" aria-pressed={mode === 'deals'} onClick={() => setMode2('deals')} className={cn('h-8 px-2.5 inline-flex items-center gap-1.5 text-xs', mode === 'deals' ? 'bg-primary/12 text-primary' : 'text-fg-muted hover:bg-surface-2')}><Handshake size={13} /> Deals</button>
        </div>
        <div data-cmp="leads.view_switch" className="inline-flex rounded-lg border border-border overflow-hidden">
          <button data-cmp="leads.view_kanban_button" aria-pressed={view === 'kanban'} onClick={() => setView2('kanban')} className={cn('h-8 px-2.5 inline-flex items-center gap-1.5 text-xs', view === 'kanban' ? 'bg-primary/12 text-primary' : 'text-fg-muted hover:bg-surface-2')}><Kanban size={13} /> Kanban</button>
          <button data-cmp="leads.view_list_button" aria-pressed={view === 'list'} onClick={() => setView2('list')} className={cn('h-8 px-2.5 inline-flex items-center gap-1.5 text-xs', view === 'list' ? 'bg-primary/12 text-primary' : 'text-fg-muted hover:bg-surface-2')}><LayoutList size={13} /> List</button>
        </div>
        <Button cmp="leads.import_button" size="sm" variant="ghost" icon={<Upload size={13} />} onClick={() => setShowImport(true)}>Import</Button>
        <Button cmp="leads.add_button" size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setShowForm(true)}>New lead</Button>
      </>
    }>
      <div data-cmp="leads.root_div" className="h-full flex flex-col animate-fade-in">
        <div data-cmp="leads.filters" className="px-4 pt-4 flex items-end gap-3 flex-wrap">
          <Input cmp="leads.search_input" placeholder={mode === 'deals' ? 'Search company, deal, contact…' : 'Search name, email, title…'} className="w-72" value={q} onChange={(e) => setParam('q', e.target.value)} leading={<Filter size={13} />} />
          <Select cmp="leads.status_select" value={statusId} onChange={(e) => setParam('status', e.target.value)} className="w-44" options={[{ value: '', label: 'All statuses' }, ...(statuses.data ?? []).map((s) => ({ value: s.id, label: s.name }))]} />
          <Select cmp="leads.owner_select" value={ownerId} onChange={(e) => setParam('owner', e.target.value)} className="w-44" options={[{ value: '', label: 'Any owner' }, ...(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))]} />
          <Button cmp="leads.archived_toggle" size="sm" variant={archived ? 'secondary' : 'ghost'} icon={<Archive size={13} />} onClick={() => setParam('archived', archived ? '' : '1')}>{archived ? 'Showing archived' : 'Archived'}</Button>
          <span data-cmp="leads.count_text" className="ml-auto text-xs text-fg-subtle">{mode === 'deals' ? `${deals.data?.length ?? 0} ${archived ? 'archived ' : ''}deals` : `${leads.data?.length ?? 0} ${archived ? 'archived ' : ''}leads`}</span>
        </div>
        {mode === 'deals' ? <DealsBoard view={view} statuses={statuses.data ?? []} deals={deals.data} loading={deals.loading} error={deals.error} setDeals={deals.setData} reload={() => void deals.reload(true)} /> : leads.loading && !leads.data ? <PageState cmp="leads" loading /> : leads.error ? <PageState cmp="leads" error={leads.error} onRetry={() => void leads.reload()} /> : view === 'kanban' ? (
          <div data-cmp="leads.kanban_board" className="flex-1 min-h-0 flex gap-3 p-4 overflow-x-auto">
            {(statuses.data ?? []).map((s) => {
              const col = cards.filter((c) => c.statusId === s.id)
              return (
                <section key={s.id} data-cmp={`leads.kanban_col_${s.id}`} onDragOver={(e) => { e.preventDefault(); setOverStatus(s.id) }} onDragLeave={() => setOverStatus(null)} onDrop={(e) => { e.preventDefault(); const dragged = cards.find((c) => c.key === dragId); if (dragged) void move(dragged, s.id); setDragId(null); setOverStatus(null) }}
                  className={cn('w-72 shrink-0 flex flex-col rounded-xl border bg-surface-2/50 max-h-full transition-colors', overStatus === s.id ? 'border-primary/60 bg-primary/5' : 'border-border')}>
                  <header data-cmp={`leads.kanban_col_header_${s.id}`} className="h-10 px-3 flex items-center gap-2 border-b border-border">
                    <span data-cmp={`leads.kanban_col_dot_${s.id}`} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span dir="auto" data-cmp={`leads.kanban_col_name_${s.id}`} className="text-sm font-medium flex-1">{s.name}</span>
                    <span data-cmp={`leads.kanban_col_count_${s.id}`} className="text-xs font-mono text-fg-muted">{col.length}</span>
                  </header>
                  <div data-cmp={`leads.kanban_col_body_${s.id}`} className="flex-1 overflow-auto p-2 flex flex-col gap-2">
                    {col.map((c) => { const l = c.lead; const k = c.key; return (
                      <article key={k} data-cmp={`leads.kanban_card_${k}`} draggable onDragStart={() => setDragId(k)} onDragEnd={() => setDragId(null)} onClick={() => nav(`/leads/${l.id}`)} onContextMenu={(e) => ctx.open(e, c)} className={cn('card p-3 flex flex-col gap-2 cursor-grab hover:border-primary/40 transition-colors', dragId === k && 'opacity-50')}>
                        <div data-cmp={`leads.kanban_card_top_${k}`} className="flex items-start gap-2">
                          <GripVertical data-cmp={`leads.kanban_card_grip_${k}`} size={12} className="text-fg-subtle mt-1.5 shrink-0" />
                          <Avatar cmp={`leads.kanban_card_avatar_${k}`} name={l.name} size="sm" />
                          <div data-cmp={`leads.kanban_card_meta_${k}`} className="min-w-0 flex-1"><div dir="auto" data-cmp={`leads.kanban_card_name_${k}`} className="text-sm font-medium truncate">{l.name}</div><div data-cmp={`leads.kanban_card_title_${k}`} className="text-xs text-fg-muted truncate">{[l.title, l.companyName, l.supplier ? 'Supplier' : null].filter(Boolean).join(' · ') || l.email}</div></div>
                          <span data-cmp={`leads.kanban_card_score_${k}`} className="font-mono text-xs text-accent">{l.score}</span>
                        </div>
                        <div data-cmp={`leads.kanban_card_badges_${k}`} className="flex items-center gap-1.5 flex-wrap">
                          {c.deal && <Badge cmp={`leads.kanban_card_deal_${k}`} tone="primary"><Handshake size={10} /> <span dir="auto">{c.deal.name}</span></Badge>}
                          {l.source && <Badge cmp={`leads.kanban_card_source_${k}`}>{l.source}</Badge>}
                          {l.enrichedAt && <Badge cmp={`leads.kanban_card_enriched_${k}`} tone="accent"><Sparkles size={10} /> Enriched</Badge>}
                        </div>
                        <div data-cmp={`leads.kanban_card_footer_${k}`} className="flex items-center justify-between text-[11px] text-fg-subtle">
                          <span data-cmp={`leads.kanban_card_activity_${k}`} className="inline-flex items-center gap-1"><Mail size={11} /> {timeAgo(l.lastActivityAt)}</span>
                          {l.ownerName && <Avatar cmp={`leads.kanban_card_owner_${k}`} name={l.ownerName} size="xs" />}
                        </div>
                      </article>
                    ) })}
                    {!col.length && <div data-cmp={`leads.kanban_col_empty_${s.id}`} className="h-16 rounded-lg border border-dashed border-border grid place-items-center text-xs text-fg-subtle">Drop here</div>}
                  </div>
                </section>
              )
            })}
            {statuses.data && !statuses.data.length && <p data-cmp="leads.kanban_nostatus" className="text-sm text-fg-muted">No statuses. <Link to="/settings" className="text-primary">Configure them in Settings.</Link></p>}
          </div>
        ) : (
          <div data-cmp="leads.list_wrap" className="p-4 flex-1 min-h-0"><div data-cmp="leads.list_card" className="card h-full overflow-hidden"><Table cmp="leads.list_table" columns={columns} rows={leads.data ?? []} rowKey={(l) => l.id} onRowClick={(l) => nav(`/leads/${l.id}`)} onRowContextMenu={(e, l) => ctx.open(e, { key: l.id, lead: l, deal: null, statusId: l.multiDeal ? null : l.statusId })} />{leads.data && !leads.data.length && <p data-cmp="leads.list_empty" className="p-8 text-center text-sm text-fg-muted">No leads match.</p>}</div></div>
        )}
      </div>
      {showForm && <LeadFormModal onClose={() => setShowForm(false)} onSaved={(l) => { setShowForm(false); nav(`/leads/${l.id}`) }} />}
      {showImport && <ImportLeadsModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); void leads.reload(true) }} />}
      {ctx.menu && (() => { const card = ctx.menu.target; const l = card.lead; const movable = !!card.deal || !l.multiDeal; return (
        <ContextMenu cmp="leads.context" x={ctx.menu.x} y={ctx.menu.y} onClose={ctx.close} items={[
          { id: 'open', label: 'Open', icon: <ExternalLink size={13} />, onSelect: () => nav(`/leads/${l.id}`) },
          ...(movable ? [{ id: 'move', label: card.deal ? `Move “${card.deal.name}” to…` : 'Move to…', icon: <ArrowRightLeft size={13} />, children: (statuses.data ?? []).filter((s) => s.id !== card.statusId).map((s) => ({ id: s.id, label: s.name, icon: <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />, onSelect: () => void move(card, s.id) })) }] : []),
          { id: 'enrich', label: 'Enrich with AI', icon: <Sparkles size={13} />, onSelect: () => void enrichLead(l) },
            { id: 'archive', label: l.archivedAt ? 'Unarchive' : 'Archive', icon: l.archivedAt ? <ArchiveRestore size={13} /> : <Archive size={13} />, onSelect: () => void archiveLead(l) },
          'separator',
          { id: 'delete', label: 'Delete lead', icon: <Trash2 size={13} />, danger: true, onSelect: () => void removeLead(l) },
        ]} />
      ) })()}
    </AppShell>
  )
}
