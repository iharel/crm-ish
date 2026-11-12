import { useState } from 'react'
import { safeUrl } from '../lib/safeUrl'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Globe, Link2, MapPin, Plus, Sparkles, Users, Pencil, Trash2, Loader2, Truck, Building2 } from 'lucide-react'
import { companiesApi, statusesApi } from '../api'
import { errorMessage } from '../api/apiError'
import { AppShell } from '../components/shell/AppShell'
import { CompanyLogo } from '../components/companies/CompanyLogo'
import { PageState } from '../components/common/PageState'
import { StatusBadge } from '../components/common/StatusBadge'
import { TasksCard } from '../components/tasks/TasksCard'
import { CompanyFormModal } from '../components/companies/CompanyFormModal'
import { CompanySuggestionsCard } from '../components/companies/CompanySuggestionsCard'
import { DealsCard } from '../components/deals/DealsCard'
import { LeadFormModal } from '../components/leads/LeadFormModal'
import { Avatar, Badge, Button, Card } from '../components/ui'
import { useToast } from '../contexts/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { shortDate, timeAgo } from '../lib/format'

/** CompanyDetailPage — profile, deals, AI insights, linked leads and threads. A supplier shows a badge, "Contacts" instead of "Leads" and may have no deal. */
export default function CompanyDetailPage() {
  const { id = '' } = useParams()
  const nav = useNavigate(); const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => companiesApi.get(id), [id])
  const statuses = useAsync(() => statusesApi.list())
  const [edit, setEdit] = useState(false); const [addLead, setAddLead] = useState(false); const [enriching, setEnriching] = useState(false)
  useSocketEvent('company:enriched', () => void reload(true)); useSocketEvent('lead:updated', () => void reload(true))
  async function enrich() { setEnriching(true); try { await companiesApi.enrich(id); await reload(true); toast.success('Company enriched') } catch (e) { toast.error(errorMessage(e)) } finally { setEnriching(false) } }
  async function remove() { if (!confirm('Delete this company? Leads stay but lose the link.')) return; try { await companiesApi.remove(id); nav('/companies') } catch (e) { toast.error(errorMessage(e)) } }
  /** Switch between supplier and regular company. Deals the company already has are kept. */
  async function setSupplier(isSupplier: boolean) { try { await companiesApi.update(id, { isSupplier }); await reload(true); toast.success(isSupplier ? 'Marked as supplier. Its existing deal was kept; delete it from the Deal card if it is not needed.' : 'Marked as a regular company') } catch (e) { toast.error(errorMessage(e)) } }
  const c = data?.company
  const sup = !!c?.isSupplier
  return (
    <AppShell title="Companies" actions={c && <><Button cmp="company.enrich_button" size="sm" variant="accent" disabled={enriching} icon={enriching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} onClick={() => void enrich()}>{c.enrichedAt ? 'Re-enrich' : 'Enrich'}</Button><Button cmp="company.supplier_button" size="sm" variant="ghost" icon={sup ? <Building2 size={13} /> : <Truck size={13} />} onClick={() => void setSupplier(!sup)}>{sup ? 'Mark as regular company' : 'Mark as supplier'}</Button><Button cmp="company.edit_button" size="sm" icon={<Pencil size={13} />} onClick={() => setEdit(true)}>Edit</Button><Button cmp="company.delete_button" size="icon" variant="ghost" aria-label="Delete" onClick={() => void remove()}><Trash2 size={15} /></Button></>}>
      <div data-cmp="company.root_div" className="p-6 space-y-5 animate-fade-in">
        <Link data-cmp="company.back_link" to={sup ? '/companies?tab=suppliers' : '/companies'} className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"><ArrowLeft size={12} /> {sup ? 'All suppliers' : 'All companies'}</Link>
        {loading || error || !data ? <PageState cmp="company" loading={loading} error={error} onRetry={() => void reload()} /> : (
          <>
            <header data-cmp="company.header" className="card-frame p-5 flex items-start gap-4">
              <span dir="auto" data-cmp="company.logo" className="h-14 w-14 rounded-xl bg-brand-gradient text-white grid place-items-center text-xl font-bold glow">{c!.name.slice(0, 2).toUpperCase()}</span>
              <div data-cmp="company.header_meta" className="flex-1">
                <div data-cmp="company.header_row" className="flex items-center gap-3 flex-wrap"><CompanyLogo cmp="company.logo" name={c!.name} logoUrl={c!.logoUrl} size="lg" /><h2 dir="auto" data-cmp="company.name" className="text-2xl font-semibold tracking-tight">{c!.name}</h2>{sup && <Badge cmp="company.supplier_badge" tone="warning"><Truck size={10} /> Supplier</Badge>}{c!.industry && <Badge cmp="company.industry_badge">{c!.industry}</Badge>}{c!.enrichedAt && <Badge cmp="company.enriched_badge" tone="accent"><Sparkles size={10} /> Enriched {timeAgo(c!.enrichedAt)}</Badge>}</div>
                <div data-cmp="company.links" className="mt-2 flex items-center gap-4 text-xs text-fg-muted flex-wrap">
                  {c!.website && <a data-cmp="company.website_link" href={safeUrl(c!.website)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg font-mono"><Globe size={12} /> {c!.domain ?? c!.website}</a>}
                  {c!.domains.filter((d) => d !== c!.domain).map((d) => <span key={d} data-cmp={`company.domain_${d}`} title="Additional domain" className="inline-flex items-center gap-1 font-mono rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px]"><Globe size={10} /> {d}</span>)}
                  {c!.linkedinUrl && <a data-cmp="company.linkedin_link" href={safeUrl(c!.linkedinUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg"><Link2 size={12} /> LinkedIn</a>}
                  {c!.location && <span data-cmp="company.location" className="inline-flex items-center gap-1"><MapPin size={12} /> {c!.location}</span>}
                  {c!.size && <span data-cmp="company.size" className="inline-flex items-center gap-1"><Users size={12} /> {c!.size} employees</span>}
                </div>
                {c!.description && <p dir="auto" data-cmp="company.description" className="bidi-plain mt-3 text-sm text-fg-muted max-w-2xl">{c!.description}</p>}
              </div>
            </header>
            <div data-cmp="company.grid" className="grid xl:grid-cols-3 gap-5">
              <CompanySuggestionsCard cmp="company.suggestions_card" companyId={data.company.id} companyName={data.company.name} onLinked={() => void reload(true)} />
              <DealsCard cmp="company.deals_card" companyId={data.company.id} deals={data.deals} leads={data.leads} statuses={statuses.data ?? []} supplier={sup} onChanged={() => void reload(true)} />
              <Card cmp="company.leads_card" className="xl:col-span-2" title={`${sup ? 'Contacts' : 'Leads'} (${data.leads.length})`} actions={<Button cmp="company.leads_add_button" size="sm" icon={<Plus size={12} />} onClick={() => setAddLead(true)}>{sup ? 'Add contact' : 'Add lead'}</Button>} padded={false}>
                <ul data-cmp="company.leads_list" className="divide-y divide-border">
                  {data.leads.map((l) => <li key={l.id} data-cmp={`company.lead_item_${l.id}`}><Link data-cmp={`company.lead_link_${l.id}`} to={`/leads/${l.id}`} className="p-3 flex items-center gap-3 hover:bg-surface-2"><Avatar cmp={`company.lead_avatar_${l.id}`} name={l.name} size="sm" /><div data-cmp={`company.lead_meta_${l.id}`} className="flex-1 min-w-0"><div dir="auto" data-cmp={`company.lead_name_${l.id}`} className="text-sm font-medium">{l.name}</div><div data-cmp={`company.lead_title_${l.id}`} className="text-xs text-fg-muted">{[l.title, l.email].filter(Boolean).join(' · ')}</div></div>{l.multiDeal ? <span data-cmp={`company.lead_deals_${l.id}`} className="flex items-center gap-1.5 flex-wrap justify-end">{l.deals.map((d) => <span key={d.id} data-cmp={`company.lead_deal_${l.id}_${d.id}`} title={d.name}><StatusBadge cmp={`company.lead_status_${l.id}_${d.id}`} status={statuses.data?.find((s) => s.id === d.statusId)} /></span>)}</span> : l.supplier && !l.deals.length ? <Badge cmp={`company.lead_nodeal_${l.id}`}>Not in a deal</Badge> : <StatusBadge cmp={`company.lead_status_${l.id}`} status={statuses.data?.find((s) => s.id === l.statusId)} />}<span data-cmp={`company.lead_score_${l.id}`} className="font-mono text-xs text-accent w-8 text-right">{l.score}</span></Link></li>)}
                  {!data.leads.length && <li data-cmp="company.leads_empty" className="p-6 text-center text-sm text-fg-muted">{sup ? 'No contacts at this supplier yet.' : 'No leads at this company yet.'}</li>}
                </ul>
              </Card>
              <TasksCard cmp="company.tasks_card" companyId={data.company.id} companyName={data.company.name} />
              <Card cmp="company.enrichment_card" title={<span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-accent" /> AI insights</span>}>
                {c!.enrichment ? (
                  <>
                    {c!.enrichment.summary && <p dir="auto" data-cmp="company.insights_summary" className="bidi-plain text-sm text-fg-muted">{c!.enrichment.summary}</p>}
                    {!!c!.enrichment.insights?.length && <ul data-cmp="company.insights_list" className="mt-3 text-sm flex flex-col gap-2">{c!.enrichment.insights.map((t, i) => <li key={i} data-cmp={`company.insight_${i}`} className="flex gap-2"><span data-cmp={`company.insight_dot_${i}`} className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />{t}</li>)}</ul>}
                    {!!c!.enrichment.products?.length && <p data-cmp="company.insights_products" className="mt-3 text-xs text-fg-muted"><span className="font-medium text-fg">Products:</span> {c!.enrichment.products.join(', ')}</p>}
                    {!!c!.enrichment.techStack?.length && <p data-cmp="company.insights_tech" className="mt-1 text-xs text-fg-muted"><span className="font-medium text-fg">Tech:</span> {c!.enrichment.techStack.join(', ')}</p>}
                    {!!c!.enrichment.sources?.length && <p data-cmp="company.insights_sources" className="mt-3 text-[11px] text-fg-subtle border-t border-border pt-2 font-mono">Sources: {c!.enrichment.sources.join(', ')}</p>}
                  </>
                ) : <p data-cmp="company.insights_empty" className="text-sm text-fg-muted">Not enriched yet. Click Enrich to scan the website and generate insights.</p>}
              </Card>
              <Card cmp="company.threads_card" className="xl:col-span-3" title={`Email threads (${data.threads.length})`} padded={false}>
                <ul data-cmp="company.threads_list" className="divide-y divide-border">
                  {data.threads.map((t) => <li key={t.id} data-cmp={`company.thread_item_${t.id}`}><Link data-cmp={`company.thread_link_${t.id}`} to={`/inbox/${t.id}`} className="p-3 flex items-center gap-3 hover:bg-surface-2"><Avatar cmp={`company.thread_avatar_${t.id}`} name={t.leadName ?? t.counterpart?.email ?? '?'} size="sm" /><div data-cmp={`company.thread_meta_${t.id}`} className="flex-1 min-w-0"><div dir="auto" data-cmp={`company.thread_subject_${t.id}`} className="text-sm font-medium truncate">{t.subject}</div><div data-cmp={`company.thread_snippet_${t.id}`} className="text-xs text-fg-muted truncate">{t.snippet}</div></div><span data-cmp={`company.thread_time_${t.id}`} className="text-xs text-fg-subtle">{shortDate(t.lastMessageAt)}</span></Link></li>)}
                  {!data.threads.length && <li data-cmp="company.threads_empty" className="p-6 text-center text-sm text-fg-muted">No email threads linked to this company.</li>}
                </ul>
              </Card>
            </div>
          </>
        )}
      </div>
      {edit && c && <CompanyFormModal company={c} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); void reload(true) }} />}
      {addLead && <LeadFormModal defaultCompanyId={id} onClose={() => setAddLead(false)} onSaved={() => { setAddLead(false); void reload(true) }} />}
    </AppShell>
  )
}
