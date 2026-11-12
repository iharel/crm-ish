import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft, Building2, CalendarClock, GripVertical, Mail, Pencil, User, UserCheck } from 'lucide-react'
import { dealsApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { useContextMenu } from '../../hooks/useContextMenu'
import { ContextMenu } from '../common/ContextMenu'
import { PageState } from '../common/PageState'
import { StatusBadge } from '../common/StatusBadge'
import { CompanyLogo } from '../companies/CompanyLogo'
import { Avatar, Badge, Table, cn, type Column } from '../ui'
import { DealFormModal } from './DealFormModal'
import { timeAgo } from '../../lib/format'
import type { DealListItem, LeadStatus } from '../../types'

export interface DealsBoardProps {
  view: 'kanban' | 'list'
  statuses: LeadStatus[]
  deals: DealListItem[] | null
  loading: boolean
  error: string | null
  /** Replace the list locally (optimistic moves). */
  setDeals: (fn: (d: DealListItem[] | null) => DealListItem[] | null) => void
  reload: () => void
}

const money = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * DealsBoard — the Deals view of the Leads page: one card / row per deal, titled with the company name (plus the
 * deal name when the company has several deals) and showing the deal's contact person. Kanban drag moves the deal.
 */
export function DealsBoard({ view, statuses, deals, loading, error, setDeals, reload }: DealsBoardProps) {
  const nav = useNavigate()
  const toast = useToast()
  const ctx = useContextMenu<DealListItem>()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStatus, setOverStatus] = useState<string | null>(null)
  const [edit, setEdit] = useState<DealListItem | null>(null)

  async function setContact(d: DealListItem, leadId: string) {
    try { await dealsApi.update(d.id, { contactLeadId: leadId }); toast.success('Contact person updated'); reload() } catch (e) { toast.error(errorMessage(e)) }
  }
  async function move(d: DealListItem, toStatus: string) {
    if (d.statusId === toStatus) return
    setDeals((list) => list?.map((x) => (x.id === d.id ? { ...x, statusId: toStatus } : x)) ?? list)
    try { await dealsApi.update(d.id, { statusId: toStatus }) } catch (e) { toast.error(errorMessage(e)); reload() }
  }

  const columns: Column<DealListItem>[] = useMemo(() => [
    { key: 'deal', header: 'Deal', render: (d) => <div data-cmp={`deals.list_deal_${d.id}`} className="flex items-center gap-2"><CompanyLogo cmp={`deals.list_logo_${d.id}`} name={d.companyName} logoUrl={d.companyLogoUrl} size="sm" /><div data-cmp={`deals.list_meta_${d.id}`} className="min-w-0"><div dir="auto" data-cmp={`deals.list_company_${d.id}`} className="font-medium truncate">{d.companyName}</div>{d.multiDeal && <div dir="auto" data-cmp={`deals.list_name_${d.id}`} className="text-xs text-fg-muted truncate">{d.name}</div>}</div></div> },
    { key: 'contact', header: 'Contact person', render: (d) => d.contact ? <div data-cmp={`deals.list_contact_${d.id}`} className="flex items-center gap-2"><Avatar cmp={`deals.list_contact_avatar_${d.id}`} name={d.contact.name} size="xs" /><div data-cmp={`deals.list_contact_meta_${d.id}`} className="min-w-0"><div dir="auto" data-cmp={`deals.list_contact_name_${d.id}`} className="truncate">{d.contact.name}</div><div data-cmp={`deals.list_contact_email_${d.id}`} className="text-xs text-fg-muted font-mono truncate">{d.contact.email ?? d.contact.title ?? ''}</div></div></div> : <span data-cmp={`deals.list_contact_${d.id}`} className="text-fg-subtle">—</span> },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge cmp={`deals.list_status_${d.id}`} status={statuses.find((s) => s.id === d.statusId)} /> },
    { key: 'amount', header: 'Amount', render: (d) => <span data-cmp={`deals.list_amount_${d.id}`} className="font-mono">{d.amount != null ? money(d.amount) : <span className="text-fg-subtle">—</span>}</span>, className: 'w-28' },
    { key: 'close', header: 'Expected close', render: (d) => <span data-cmp={`deals.list_close_${d.id}`} className="text-fg-muted">{d.expectedCloseDate ? day(d.expectedCloseDate) : '—'}</span> },
    { key: 'leads', header: 'Leads', render: (d) => <div data-cmp={`deals.list_leads_${d.id}`} className="flex items-center gap-1">{d.leads.slice(0, 5).map((l) => <span key={l.id} data-cmp={`deals.list_lead_${d.id}_${l.id}`} title={l.name}><Avatar cmp={`deals.list_lead_avatar_${d.id}_${l.id}`} name={l.name} size="xs" /></span>)}{d.leads.length > 5 && <span data-cmp={`deals.list_leads_more_${d.id}`} className="text-xs text-fg-subtle">+{d.leads.length - 5}</span>}</div> },
    { key: 'owner', header: 'Owner', render: (d) => d.ownerName ? <Avatar cmp={`deals.list_owner_${d.id}`} name={d.ownerName} size="xs" /> : <span data-cmp={`deals.list_owner_${d.id}`}>—</span> },
    { key: 'activity', header: 'Last activity', render: (d) => <span data-cmp={`deals.list_activity_${d.id}`} className="text-fg-subtle text-xs">{timeAgo(d.lastActivityAt)}</span> },
  ], [statuses])

  if (loading && !deals) return <PageState cmp="deals" loading />
  if (error) return <PageState cmp="deals" error={error} onRetry={reload} />
  const rows = deals ?? []

  return (
    <>
      {view === 'kanban' ? (
        <div data-cmp="deals.kanban_board" className="flex-1 min-h-0 flex gap-3 p-4 overflow-x-auto">
          {statuses.map((s) => {
            const col = rows.filter((d) => d.statusId === s.id)
            return (
              <section key={s.id} data-cmp={`deals.kanban_col_${s.id}`} onDragOver={(e) => { e.preventDefault(); setOverStatus(s.id) }} onDragLeave={() => setOverStatus(null)} onDrop={(e) => { e.preventDefault(); const dragged = rows.find((d) => d.id === dragId); if (dragged) void move(dragged, s.id); setDragId(null); setOverStatus(null) }}
                className={cn('w-72 shrink-0 flex flex-col rounded-xl border bg-surface-2/50 max-h-full transition-colors', overStatus === s.id ? 'border-primary/60 bg-primary/5' : 'border-border')}>
                <header data-cmp={`deals.kanban_col_header_${s.id}`} className="h-10 px-3 flex items-center gap-2 border-b border-border">
                  <span data-cmp={`deals.kanban_col_dot_${s.id}`} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span dir="auto" data-cmp={`deals.kanban_col_name_${s.id}`} className="text-sm font-medium flex-1">{s.name}</span>
                  <span data-cmp={`deals.kanban_col_count_${s.id}`} className="text-xs font-mono text-fg-muted">{col.length}</span>
                </header>
                <div data-cmp={`deals.kanban_col_body_${s.id}`} className="flex-1 overflow-auto p-2 flex flex-col gap-2">
                  {col.map((d) => (
                    <article key={d.id} data-cmp={`deals.kanban_card_${d.id}`} draggable onDragStart={() => setDragId(d.id)} onDragEnd={() => setDragId(null)} onClick={() => nav(`/companies/${d.companyId}`)} onContextMenu={(e) => ctx.open(e, d)} className={cn('card p-3 flex flex-col gap-2 cursor-grab hover:border-primary/40 transition-colors', dragId === d.id && 'opacity-50')}>
                      <div data-cmp={`deals.kanban_card_top_${d.id}`} className="flex items-start gap-2">
                        <GripVertical data-cmp={`deals.kanban_card_grip_${d.id}`} size={12} className="text-fg-subtle mt-1.5 shrink-0" />
                        <CompanyLogo cmp={`deals.kanban_card_logo_${d.id}`} name={d.companyName} logoUrl={d.companyLogoUrl} size="sm" />
                        <div data-cmp={`deals.kanban_card_meta_${d.id}`} className="min-w-0 flex-1">
                          <div dir="auto" data-cmp={`deals.kanban_card_company_${d.id}`} className="text-sm font-medium truncate">{d.companyName}</div>
                          {d.multiDeal && <div dir="auto" data-cmp={`deals.kanban_card_name_${d.id}`} className="text-xs text-primary truncate">{d.name}</div>}
                        </div>
                        {d.amount != null && <span data-cmp={`deals.kanban_card_amount_${d.id}`} className="font-mono text-xs text-accent">{money(d.amount)}</span>}
                      </div>
                      <div data-cmp={`deals.kanban_card_contact_${d.id}`} className="flex items-center gap-2 text-xs">
                        {d.contact ? <><Avatar cmp={`deals.kanban_card_contact_avatar_${d.id}`} name={d.contact.name} size="xs" /><span dir="auto" data-cmp={`deals.kanban_card_contact_name_${d.id}`} className="truncate">{d.contact.name}</span>{d.contact.title && <span dir="auto" data-cmp={`deals.kanban_card_contact_title_${d.id}`} className="text-fg-subtle truncate">· {d.contact.title}</span>}</> : <span data-cmp={`deals.kanban_card_contact_none_${d.id}`} className="text-fg-subtle">No contact person</span>}
                      </div>
                      <div data-cmp={`deals.kanban_card_badges_${d.id}`} className="flex items-center gap-1.5 flex-wrap">
                        {d.leads.length > 1 && <Badge cmp={`deals.kanban_card_leads_${d.id}`}>{d.leads.length} leads</Badge>}
                        {d.expectedCloseDate && <Badge cmp={`deals.kanban_card_close_${d.id}`}><CalendarClock size={10} /> {day(d.expectedCloseDate)}</Badge>}
                      </div>
                      <div data-cmp={`deals.kanban_card_footer_${d.id}`} className="flex items-center justify-between text-[11px] text-fg-subtle">
                        <span data-cmp={`deals.kanban_card_activity_${d.id}`} className="inline-flex items-center gap-1"><Mail size={11} /> {timeAgo(d.lastActivityAt)}</span>
                        {d.ownerName && <Avatar cmp={`deals.kanban_card_owner_${d.id}`} name={d.ownerName} size="xs" />}
                      </div>
                    </article>
                  ))}
                  {!col.length && <div data-cmp={`deals.kanban_col_empty_${s.id}`} className="h-16 rounded-lg border border-dashed border-border grid place-items-center text-xs text-fg-subtle">Drop here</div>}
                </div>
              </section>
            )
          })}
          {!statuses.length && <p data-cmp="deals.kanban_nostatus" className="text-sm text-fg-muted">No statuses configured.</p>}
        </div>
      ) : (
        <div data-cmp="deals.list_wrap" className="p-4 flex-1 min-h-0"><div data-cmp="deals.list_card" className="card h-full overflow-hidden"><Table cmp="deals.list_table" columns={columns} rows={rows} rowKey={(d) => d.id} onRowClick={(d) => nav(`/companies/${d.companyId}`)} onRowContextMenu={(e, d) => ctx.open(e, d)} />{!rows.length && <p data-cmp="deals.list_empty" className="p-8 text-center text-sm text-fg-muted">No deals match. A deal appears here once its company has a lead.</p>}</div></div>
      )}
      {edit && <DealFormModal companyId={edit.companyId} deal={edit} leads={edit.leads} statuses={statuses} pickLeads={false} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
      {ctx.menu && (() => { const d = ctx.menu.target; return (
        <ContextMenu cmp="deals.context" x={ctx.menu.x} y={ctx.menu.y} onClose={ctx.close} items={[
          { id: 'open', label: 'Open company', icon: <Building2 size={13} />, onSelect: () => nav(`/companies/${d.companyId}`) },
          ...(d.contact ? [{ id: 'contact', label: `Open ${d.contact.name}`, icon: <User size={13} />, onSelect: () => nav(`/leads/${d.contact!.id}`) }] : []),
          { id: 'move', label: 'Move to…', icon: <ArrowRightLeft size={13} />, children: statuses.filter((s) => s.id !== d.statusId).map((s) => ({ id: s.id, label: s.name, icon: <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />, onSelect: () => void move(d, s.id) })) },
          ...(d.leads.length > 1 ? [{ id: 'contact_set', label: 'Set contact person', icon: <UserCheck size={13} />, children: d.leads.filter((l) => l.id !== d.contact?.id).map((l) => ({ id: l.id, label: l.name, onSelect: () => void setContact(d, l.id) })) }] : []),
          { id: 'edit', label: 'Edit deal', icon: <Pencil size={13} />, onSelect: () => setEdit(d) },
        ]} />
      ) })()}
    </>
  )
}
