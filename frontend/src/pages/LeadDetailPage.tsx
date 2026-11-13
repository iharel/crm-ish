import { useState } from 'react'
import { safeUrl } from '../lib/safeUrl'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Link2, Sparkles, Calendar, Pencil, Trash2, MessageSquare, ArrowRightLeft, StickyNote, Video, Building2, Loader2 } from 'lucide-react'
import { leadsApi, statusesApi } from '../api'
import { errorMessage } from '../api/apiError'
import { AppShell } from '../components/shell/AppShell'
import { PageState } from '../components/common/PageState'
import { StatusBadge } from '../components/common/StatusBadge'
import { TasksCard } from '../components/tasks/TasksCard'
import { DocumentsCard } from '../components/signing/DocumentsCard'
import { LeadFormModal } from '../components/leads/LeadFormModal'
import { ComposeModal } from '../components/email/ComposeModal'
import { MeetingModal } from '../components/email/MeetingModal'
import { Avatar, Badge, Button, Card, Select, Textarea } from '../components/ui'
import { useToast } from '../contexts/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { fullDate, shortDate, timeAgo } from '../lib/format'
import { activityText } from './DashboardPage'

const actIcon: Record<string, React.ReactNode> = { email: <Mail size={12} />, status_change: <ArrowRightLeft size={12} />, note: <StickyNote size={12} />, enrichment: <Sparkles size={12} />, meeting: <Calendar size={12} />, system: <StickyNote size={12} /> }

/** LeadDetailPage — profile, enrichment, timeline, threads, meetings. */
export default function LeadDetailPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(() => leadsApi.get(id), [id])
  const statuses = useAsync(() => statusesApi.list())
  const [note, setNote] = useState('')
  const [edit, setEdit] = useState(false)
  const [compose, setCompose] = useState(false)
  const [meeting, setMeeting] = useState(false)
  const [enriching, setEnriching] = useState(false)
  useSocketEvent<{ leadId?: string; lead?: { id: string } }>('lead:updated', (p) => { if (p.leadId === id || p.lead?.id === id) void reload(true) })
  useSocketEvent<{ id: string }>('lead:enriched', (l) => { if (l.id === id) void reload(true) })
  useSocketEvent('email:new', () => void reload(true))

  async function changeStatus(statusId: string, dealId?: string) { try { const lead = await leadsApi.move(id, statusId, dealId); setData((d) => d ? { ...d, lead } : d); toast.success('Status updated') } catch (e) { toast.error(errorMessage(e)) } }
  async function addNote() { if (!note.trim()) return; try { await leadsApi.addNote(id, note.trim()); setNote(''); await reload(true) } catch (e) { toast.error(errorMessage(e)) } }
  async function enrich() { setEnriching(true); try { await leadsApi.enrich(id); await reload(true); toast.success('Lead enriched') } catch (e) { toast.error(errorMessage(e)) } finally { setEnriching(false) } }
  async function remove() { if (!confirm('Delete this lead?')) return; try { await leadsApi.remove(id); toast.success('Lead deleted'); nav('/leads') } catch (e) { toast.error(errorMessage(e)) } }

  const lead = data?.lead
  return (
    <AppShell title="Leads" actions={lead && <>
      <Button cmp="lead.enrich_button" size="sm" variant="accent" disabled={enriching} icon={enriching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} onClick={() => void enrich()}>{enriching ? 'Enriching…' : lead.enrichedAt ? 'Re-enrich' : 'Enrich'}</Button>
      <Button cmp="lead.email_button" size="sm" variant="primary" icon={<Mail size={13} />} onClick={() => setCompose(true)}>Email</Button>
      <Button cmp="lead.meeting_button" size="sm" icon={<Calendar size={13} />} onClick={() => setMeeting(true)}>Meeting</Button>
      <Button cmp="lead.edit_button" size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(true)}><Pencil size={15} /></Button>
      <Button cmp="lead.delete_button" size="icon" variant="ghost" aria-label="Delete" onClick={() => void remove()}><Trash2 size={15} /></Button>
    </>}>
      <div data-cmp="lead.root_div" className="p-6 space-y-5 animate-fade-in">
        <Link data-cmp="lead.back_link" to="/leads" className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"><ArrowLeft size={12} /> All leads</Link>
        {loading || error || !data ? <PageState cmp="lead" loading={loading} error={error} onRetry={() => void reload()} /> : (
          <>
            <header data-cmp="lead.header" className="card-frame p-5 flex items-start gap-4 flex-wrap">
              <Avatar cmp="lead.header_avatar" name={lead!.name} size="lg" />
              <div data-cmp="lead.header_meta" className="flex-1 min-w-64">
                <div data-cmp="lead.header_row" className="flex items-center gap-3 flex-wrap">
                  <h2 dir="auto" data-cmp="lead.header_name" className="text-2xl font-semibold tracking-tight">{lead!.name}</h2>
                  {lead!.multiDeal ? lead!.deals.map((d) => <span key={d.id} data-cmp={`lead.header_deal_${d.id}`} className="inline-flex items-center gap-1.5"><StatusBadge cmp={`lead.header_status_${d.id}`} status={statuses.data?.find((s) => s.id === d.statusId)} /><span dir="auto" data-cmp={`lead.header_deal_name_${d.id}`} className="text-xs text-fg-muted">{d.name}</span></span>) : lead!.supplier && !lead!.deals.length ? <Badge cmp="lead.header_supplier" tone="warning">Supplier contact</Badge> : <>{lead!.supplier && <Badge cmp="lead.header_supplier" tone="warning">Supplier</Badge>}<StatusBadge cmp="lead.header_status" status={statuses.data?.find((s) => s.id === lead!.statusId)} /></>}
                  <Badge cmp="lead.header_score" tone="accent">Score {lead!.score}</Badge>
                </div>
                <p dir="auto" data-cmp="lead.header_title" className="text-fg-muted mt-0.5">{lead!.title ?? 'No title'}{lead!.companyId && <> at <Link dir="auto" data-cmp="lead.header_company_link" to={`/companies/${lead!.companyId}`} className="text-primary hover:underline">{lead!.companyName}</Link></>}</p>
                <div data-cmp="lead.header_contacts" className="mt-2 flex items-center gap-4 text-xs text-fg-muted flex-wrap">
                  {lead!.email && <span data-cmp="lead.header_email" className="inline-flex items-center gap-1.5 font-mono"><Mail size={12} /> {lead!.email}</span>}
                  {lead!.phone && <span data-cmp="lead.header_phone" className="inline-flex items-center gap-1.5 font-mono"><Phone size={12} /> {lead!.phone}</span>}
                  {lead!.linkedinUrl && <a data-cmp="lead.header_linkedin" href={safeUrl(lead!.linkedinUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-fg"><Link2 size={12} /> LinkedIn</a>}
                  {lead!.source && <Badge cmp="lead.header_source">{lead!.source}</Badge>}
                </div>
              </div>
              <div data-cmp="lead.header_side" className="flex flex-col gap-2 w-52">
                {lead!.multiDeal
                  ? lead!.deals.map((d) => <Select key={d.id} cmp={`lead.status_select_${d.id}`} label={d.name} value={d.statusId ?? ''} onChange={(e) => void changeStatus(e.target.value, d.id)} options={(statuses.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />)
                  : lead!.supplier && !lead!.deals.length ? <p data-cmp="lead.supplier_note" className="text-xs text-fg-muted">Supplier contact — not in the pipeline. Add them to a deal on the supplier's page to track a status.</p>
                  : <Select cmp="lead.status_select" label="Status" value={lead!.statusId ?? ''} onChange={(e) => void changeStatus(e.target.value)} options={(statuses.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />}
                <div data-cmp="lead.owner_row" className="flex items-center gap-2 text-xs text-fg-muted"><span data-cmp="lead.owner_label">Owner</span>{lead!.ownerName && <Avatar cmp="lead.owner_avatar" name={lead!.ownerName} size="xs" />}<span data-cmp="lead.owner_name" className="text-fg">{lead!.ownerName ?? 'Unassigned'}</span></div>
              </div>
            </header>
            <div data-cmp="lead.grid" className="grid xl:grid-cols-3 gap-5">
              <div data-cmp="lead.left_col" className="xl:col-span-2 flex flex-col gap-5">
                <Card cmp="lead.timeline_card" title="Timeline" padded={false}>
                  <div data-cmp="lead.compose_note" className="p-4 border-b border-border flex flex-col gap-2">
                    <Textarea cmp="lead.note_textarea" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" />
                    <div data-cmp="lead.note_actions" className="flex justify-end"><Button cmp="lead.note_save_button" size="sm" variant="primary" onClick={() => void addNote()} disabled={!note.trim()}>Add note</Button></div>
                  </div>
                  <ol data-cmp="lead.timeline_list" className="p-4 flex flex-col gap-4">
                    {data.activities.map((a) => (
                      <li key={a.id} data-cmp={`lead.timeline_item_${a.id}`} className="flex gap-3 text-sm">
                        <span data-cmp={`lead.timeline_icon_${a.id}`} className="h-6 w-6 rounded-full bg-surface-3 text-fg-muted grid place-items-center shrink-0">{actIcon[a.type] ?? <StickyNote size={12} />}</span>
                        <div data-cmp={`lead.timeline_meta_${a.id}`} className="flex-1 min-w-0"><p data-cmp={`lead.timeline_text_${a.id}`}>{a.type === 'email' && typeof a.payload.threadId === 'string' ? <Link to={`/inbox/${a.payload.threadId}`} className="hover:text-primary">{activityText(a.type, a.payload)}</Link> : activityText(a.type, a.payload)}</p><p data-cmp={`lead.timeline_time_${a.id}`} className="text-xs text-fg-subtle">{a.userName ? `${a.userName} · ` : ''}{fullDate(a.createdAt)}</p></div>
                      </li>
                    ))}
                    {!data.activities.length && <li data-cmp="lead.timeline_empty" className="text-sm text-fg-muted">No activity yet.</li>}
                  </ol>
                </Card>
                <Card cmp="lead.threads_card" title={`Email threads (${data.threads.length})`} padded={false} actions={<Button cmp="lead.threads_compose_button" size="sm" icon={<MessageSquare size={12} />} onClick={() => setCompose(true)}>New email</Button>}>
                  <ul data-cmp="lead.threads_list" className="divide-y divide-border">
                    {data.threads.map((t) => (
                      <li key={t.id} data-cmp={`lead.thread_item_${t.id}`}><Link data-cmp={`lead.thread_link_${t.id}`} to={`/inbox/${t.id}`} className="p-3 flex items-center gap-3 hover:bg-surface-2">
                        <div data-cmp={`lead.thread_meta_${t.id}`} className="flex-1 min-w-0"><div dir="auto" data-cmp={`lead.thread_subject_${t.id}`} className="text-sm font-medium truncate">{t.subject}</div><div data-cmp={`lead.thread_snippet_${t.id}`} className="text-xs text-fg-muted truncate">{t.snippet}</div></div>
                        {t.hasDraft && <Badge cmp={`lead.thread_draft_${t.id}`} tone="accent"><Sparkles size={10} /> Draft</Badge>}
                        <span data-cmp={`lead.thread_time_${t.id}`} className="text-xs text-fg-subtle">{shortDate(t.lastMessageAt)}</span>
                      </Link></li>
                    ))}
                    {!data.threads.length && <li data-cmp="lead.threads_empty" className="p-6 text-center text-sm text-fg-muted">No linked emails yet. Threads with {lead!.email ?? 'this lead'} will appear here automatically.</li>}
                  </ul>
                </Card>
              </div>
              <div data-cmp="lead.right_col" className="flex flex-col gap-5">
                <Card cmp="lead.enrichment_card" title={<span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-accent" /> AI enrichment</span>} actions={lead!.enrichedAt && <span data-cmp="lead.enrichment_time" className="text-xs text-fg-subtle">{timeAgo(lead!.enrichedAt)}</span>}>
                  {lead!.enrichment ? (
                    <>
                      <dl data-cmp="lead.enrichment_list" className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                        {[['Seniority', lead!.enrichment.seniority], ['Department', lead!.enrichment.department], ['Buying role', lead!.enrichment.buyingRole]].filter(([, v]) => v).map(([k, v]) => <div key={k} data-cmp={`lead.enrichment_row_${k}`} className="contents"><dt data-cmp={`lead.enrichment_key_${k}`} className="text-fg-muted">{k}</dt><dd data-cmp={`lead.enrichment_val_${k}`} className="capitalize">{v}</dd></div>)}
                      </dl>
                      {lead!.enrichment.summary && <p dir="auto" data-cmp="lead.enrichment_summary" className="bidi-plain mt-3 text-sm text-fg-muted border-t border-border pt-3">{lead!.enrichment.summary}</p>}
                      {!!lead!.enrichment.talkingPoints?.length && <ul data-cmp="lead.enrichment_points" className="mt-3 text-sm flex flex-col gap-1.5">{lead!.enrichment.talkingPoints.map((t, i) => <li key={i} data-cmp={`lead.enrichment_point_${i}`} className="flex gap-2"><span data-cmp={`lead.enrichment_point_dot_${i}`} className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />{t}</li>)}</ul>}
                      {lead!.enrichment.model && <p data-cmp="lead.enrichment_model" className="mt-3 text-[11px] text-fg-subtle font-mono">{lead!.enrichment.model}</p>}
                    </>
                  ) : <p data-cmp="lead.enrichment_empty" className="text-sm text-fg-muted">Not enriched yet. Click Enrich to let AI research this lead.</p>}
                </Card>
                <TasksCard cmp="lead.tasks_card" leadId={lead!.id} leadName={lead!.name} companyId={lead!.companyId ?? undefined} companyName={lead!.companyName} />
                {lead!.companyId && <DocumentsCard cmp="lead.documents_card" companyId={lead!.companyId} companyName={lead!.companyName} />}
                <Card cmp="lead.company_card" title="Company">
                  {lead!.companyId ? <Link data-cmp="lead.company_link" to={`/companies/${lead!.companyId}`} className="flex items-center gap-3 hover:text-primary"><span data-cmp="lead.company_logo" className="h-9 w-9 rounded-lg bg-surface-3 grid place-items-center text-fg-muted"><Building2 size={16} /></span><span dir="auto" data-cmp="lead.company_name" className="font-medium">{lead!.companyName}</span></Link> : lead!.suggestedCompany ? (
                    <div data-cmp="lead.company_suggestion" className="flex flex-col gap-2">
                      <p data-cmp="lead.company_suggestion_text" className="text-sm">Looks like <span dir="auto" className="font-medium">{lead!.suggestedCompany.name}</span> <span data-cmp="lead.company_suggestion_hint" className="text-xs text-fg-muted">(email domain matches{lead!.suggestedCompany.domain ? <> <span className="font-mono">{lead!.suggestedCompany.domain}</span></> : ''})</span></p>
                      <Button cmp="lead.company_suggestion_button" size="sm" variant="primary" icon={<Building2 size={12} />} onClick={() => { void leadsApi.update(lead!.id, { companyId: lead!.suggestedCompany!.id }).then(() => { toast.success(`Linked to ${lead!.suggestedCompany!.name}`); void reload(true) }).catch((e) => toast.error(errorMessage(e))) }}>Link to {lead!.suggestedCompany.name}</Button>
                    </div>
                  ) : <p data-cmp="lead.company_empty" className="text-sm text-fg-muted">No company linked.</p>}
                </Card>
                <Card cmp="lead.meetings_card" title="Meetings" padded={false}>
                  <ul data-cmp="lead.meetings_list" className="divide-y divide-border">
                    {data.meetings.map((m) => <li key={m.id} data-cmp={`lead.meeting_${m.id}`} className="p-3 flex items-center gap-3 text-sm"><span data-cmp={`lead.meeting_icon_${m.id}`} className="h-8 w-8 rounded-lg bg-primary/12 text-primary grid place-items-center"><Calendar size={14} /></span><div data-cmp={`lead.meeting_meta_${m.id}`} className="flex-1 min-w-0"><p dir="auto" data-cmp={`lead.meeting_title_${m.id}`} className="font-medium truncate">{m.title}</p><p data-cmp={`lead.meeting_time_${m.id}`} className="text-xs text-fg-muted">{fullDate(m.starts_at)}</p></div>{m.meet_link && <a data-cmp={`lead.meeting_link_${m.id}`} href={m.meet_link} target="_blank" rel="noreferrer" className="text-fg-subtle hover:text-fg"><Video size={14} /></a>}</li>)}
                    {!data.meetings.length && <li data-cmp="lead.meetings_empty" className="p-4 text-sm text-fg-muted">No meetings booked.</li>}
                  </ul>
                </Card>
                {lead!.notes && <Card cmp="lead.notes_card" title="Notes"><p dir="auto" data-cmp="lead.notes_text" className="bidi-plain text-sm whitespace-pre-wrap">{lead!.notes}</p></Card>}
              </div>
            </div>
          </>
        )}
      </div>
      {edit && lead && <LeadFormModal lead={lead} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); void reload(true) }} />}
      {compose && lead && <ComposeModal to={lead.email ? [lead.email] : []} leadId={lead.id} onClose={() => setCompose(false)} onSent={() => { setCompose(false); void reload(true) }} />}
      {meeting && lead && <MeetingModal leadId={lead.id} leadName={lead.name} onClose={() => setMeeting(false)} onBooked={() => { setMeeting(false); void reload(true) }} />}
    </AppShell>
  )
}
