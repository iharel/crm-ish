import { useState } from 'react'
import { safeUrl } from '../lib/safeUrl'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileSignature, Plus, Sparkles, Globe, Search, ExternalLink, Trash2, Truck, Building2 } from 'lucide-react'
import { companiesApi } from '../api'
import { AppShell } from '../components/shell/AppShell'
import { CompanyLogo } from '../components/companies/CompanyLogo'
import { PageState } from '../components/common/PageState'
import { CompanyFormModal } from '../components/companies/CompanyFormModal'
import { Badge, Button, Input, Table, Tabs, type Column } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useContextMenu } from '../hooks/useContextMenu'
import { ContextMenu } from '../components/common/ContextMenu'
import { useToast } from '../contexts/ToastContext'
import { errorMessage } from '../api/apiError'
import { useSocketEvent } from '../hooks/useSocketEvent'
import type { Company } from '../types'

/** CompaniesPage — company list in two tabs: Companies (customers / prospects) and Suppliers. The tab lives in the URL (`?tab=suppliers`). */
export default function CompaniesPage() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [params, setParams] = useSearchParams()
  const suppliers = params.get('tab') === 'suppliers'
  const noun = suppliers ? 'supplier' : 'company'
  const [showForm, setShowForm] = useState(false)
  const toast = useToast()
  const { data, setData, loading, error, reload } = useAsync(() => companiesApi.list(q || undefined, suppliers ? 'supplier' : 'company'), [q, suppliers])
  const ctx = useContextMenu<Company>()
  async function enrichCompany(c: Company) { try { const u = await companiesApi.enrich(c.id); setData((d) => d?.map((x) => (x.id === c.id ? u : x)) ?? d); toast.success('Company enriched') } catch (e) { toast.error(errorMessage(e)) } }
  async function removeCompany(c: Company) { if (!confirm(`Delete ${c.name}? Its leads are kept and unlinked from the company.`)) return; try { await companiesApi.remove(c.id); setData((d) => d?.filter((x) => x.id !== c.id) ?? d); toast.success('Company deleted') } catch (e) { toast.error(errorMessage(e)) } }
  /** Move a company between the two tabs. Deals it already has are kept. */
  async function setSupplier(c: Company, isSupplier: boolean) {
    try { await companiesApi.update(c.id, { isSupplier }); setData((d) => d?.filter((x) => x.id !== c.id) ?? d); toast.success(isSupplier ? `${c.name} is now a supplier. Its existing deal was kept.` : `${c.name} is now a regular company`) } catch (e) { toast.error(errorMessage(e)) }
  }
  useSocketEvent('company:enriched', () => void reload(true)); useSocketEvent('lead:updated', () => void reload(true))
  const columns: Column<Company>[] = [
    { key: 'name', header: 'Company', render: (c) => <div data-cmp={`companies.cell_${c.id}`} className="flex items-center gap-2"><CompanyLogo cmp={`companies.logo_${c.id}`} name={c.name} logoUrl={c.logoUrl} size="sm" /><div data-cmp={`companies.meta_${c.id}`}><div dir="auto" data-cmp={`companies.title_${c.id}`} className="font-medium">{c.name}</div>{c.domains.length > 0 && <div data-cmp={`companies.domain_${c.id}`} title={c.domains.join(', ')} className="text-xs text-fg-muted font-mono inline-flex items-center gap-1"><Globe size={10} /> {c.domains[0]}{c.domains.length > 1 && <span data-cmp={`companies.domain_more_${c.id}`} className="text-fg-subtle">+{c.domains.length - 1}</span>}</div>}</div></div> },
    { key: 'industry', header: 'Industry', render: (c) => <span dir="auto" data-cmp={`companies.industry_${c.id}`} className="text-fg-muted">{c.industry ?? '—'}</span> },
    { key: 'size', header: 'Size', render: (c) => <span data-cmp={`companies.size_${c.id}`} className="font-mono text-xs">{c.size ?? '—'}</span> },
    { key: 'location', header: 'Location', render: (c) => <span dir="auto" data-cmp={`companies.location_${c.id}`} className="text-fg-muted">{c.location ?? '—'}</span> },
    { key: 'leads', header: suppliers ? 'Contacts' : 'Leads', render: (c) => <Badge cmp={`companies.leads_${c.id}`} tone="primary">{c.leadCount}</Badge> },
    { key: 'enriched', header: 'AI', render: (c) => c.enrichedAt ? <Badge cmp={`companies.enriched_${c.id}`} tone="accent"><Sparkles size={10} /> Enriched</Badge> : <span data-cmp={`companies.enriched_${c.id}`} className="text-xs text-fg-subtle">—</span> },
  ]
  return (
    <AppShell title="Companies" actions={<Button cmp="companies.add_button" size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setShowForm(true)}>{suppliers ? 'New supplier' : 'New company'}</Button>}>
      <div data-cmp="companies.root_div" className="p-4 flex flex-col gap-3 h-full animate-fade-in">
        <Tabs cmp="companies.tabs" active={suppliers ? 'suppliers' : 'companies'} onChange={(id) => setParams(id === 'suppliers' ? { tab: 'suppliers' } : {}, { replace: true })} tabs={[{ id: 'companies', label: 'Companies' }, { id: 'suppliers', label: 'Suppliers' }]} />
        <div data-cmp="companies.filters" className="flex items-center gap-3"><Input cmp="companies.search_input" placeholder={suppliers ? 'Search suppliers or domains…' : 'Search companies or domains…'} className="w-80" value={q} onChange={(e) => setQ(e.target.value)} leading={<Search size={13} />} /><span data-cmp="companies.count_text" className="ml-auto text-xs text-fg-subtle">{data?.length ?? 0} {suppliers ? 'suppliers' : 'companies'}</span></div>
        {loading && !data ? <PageState cmp="companies" loading /> : error ? <PageState cmp="companies" error={error} onRetry={() => void reload()} /> : (
          <div data-cmp="companies.table_card" className="card flex-1 min-h-0 overflow-hidden"><Table cmp="companies.table" columns={columns} rows={data ?? []} rowKey={(c) => c.id} onRowClick={(c) => nav(`/companies/${c.id}`)} onRowContextMenu={(e, c) => ctx.open(e, c)} />{data && !data.length && <p data-cmp="companies.empty" className="p-8 text-center text-sm text-fg-muted">{suppliers ? 'No suppliers yet. Add one here, mark a company as a supplier from its right-click menu, or use "Set as supplier" on an email in the Inbox.' : 'No companies yet. They are created automatically from lead email domains.'}</p>}</div>
        )}
      </div>
      {showForm && <CompanyFormModal defaultSupplier={suppliers} onClose={() => setShowForm(false)} onSaved={(c) => { setShowForm(false); nav(`/companies/${c.id}`) }} />}
      {ctx.menu && (() => { const c = ctx.menu.target; return (
        <ContextMenu cmp="companies.context" x={ctx.menu.x} y={ctx.menu.y} onClose={ctx.close} items={[
          { id: 'open', label: 'Open', icon: <ExternalLink size={13} />, onSelect: () => nav(`/companies/${c.id}`) },
          { id: 'site', label: 'Visit website', icon: <Globe size={13} />, disabled: !safeUrl(c.website), onSelect: () => { const url = safeUrl(c.website); if (url) window.open(url, '_blank', 'noopener') } },
          { id: 'enrich', label: 'Enrich with AI', icon: <Sparkles size={13} />, onSelect: () => void enrichCompany(c) },
          { id: 'sign', label: 'Send for signature…', icon: <FileSignature size={13} />, onSelect: () => nav(`/documents?${new URLSearchParams({ new: '1', companyId: c.id, companyName: c.name }).toString()}`) },
          { id: 'supplier', label: c.isSupplier ? 'Mark as regular company' : 'Mark as supplier', icon: c.isSupplier ? <Building2 size={13} /> : <Truck size={13} />, onSelect: () => void setSupplier(c, !c.isSupplier) },
          'separator',
          { id: 'delete', label: `Delete ${noun}`, icon: <Trash2 size={13} />, danger: true, onSelect: () => void removeCompany(c) },
        ]} />
      ) })()}
    </AppShell>
  )
}
