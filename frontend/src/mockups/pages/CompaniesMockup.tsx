import { Plus, Sparkles, Globe, Filter } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Badge, Button, Input, Table, type Column } from '../../components/ui'
import { companies, type MockCompany } from '../data'

/** CompaniesMockup — company list. */
export default function CompaniesMockup() {
  const columns: Column<MockCompany>[] = [
    { key: 'name', header: 'Company', render: (c) => <div data-cmp={`companies.name_${c.id}`} className="flex items-center gap-2"><span data-cmp={`companies.logo_${c.id}`} className="h-7 w-7 rounded bg-surface-3 inline-flex items-center justify-center text-xs font-semibold text-fg-muted">{c.name[0]}</span><div data-cmp={`companies.meta_${c.id}`}><div data-cmp={`companies.title_${c.id}`} className="font-medium">{c.name}</div><div data-cmp={`companies.domain_${c.id}`} className="text-xs text-fg-muted font-mono inline-flex items-center gap-1"><Globe size={10} /> {c.domain}</div></div></div> },
    { key: 'industry', header: 'Industry', render: (c) => <span data-cmp={`companies.industry_${c.id}`} className="text-fg-muted">{c.industry}</span> },
    { key: 'size', header: 'Size', render: (c) => <span data-cmp={`companies.size_${c.id}`} className="font-mono text-xs">{c.size}</span> },
    { key: 'location', header: 'Location', render: (c) => <span data-cmp={`companies.location_${c.id}`} className="text-fg-muted">{c.location}</span> },
    { key: 'leads', header: 'Leads', render: (c) => <Badge cmp={`companies.leads_${c.id}`} tone="primary">{c.leads}</Badge> },
    { key: 'enriched', header: 'Enrichment', render: (c) => c.enriched ? <Badge cmp={`companies.enriched_${c.id}`} tone="accent"><Sparkles size={10} /> Enriched</Badge> : <Button cmp={`companies.enrich_${c.id}`} size="sm" variant="ghost" icon={<Sparkles size={11} />}>Enrich</Button> },
  ]
  return (
    <MockupFrame name="companies" title="Companies">
      <AppShell active="companies" title="Companies" actions={<><Button cmp="companies.filter_button" size="sm" icon={<Filter size={13} />}>Filter</Button><Button cmp="companies.add_button" size="sm" variant="primary" icon={<Plus size={13} />}>New company</Button></>}>
        <div data-cmp="companies.root_div" className="p-4 flex flex-col gap-3 h-full">
          <div data-cmp="companies.filters" className="flex items-center gap-3"><Input cmp="companies.search_input" placeholder="Search companies or domains…" className="w-80" /><span data-cmp="companies.count_text" className="ml-auto text-xs text-fg-subtle">{companies.length} companies</span></div>
          <div data-cmp="companies.table_card" className="card flex-1 min-h-0 overflow-hidden"><Table cmp="companies.table" columns={columns} rows={companies} rowKey={(c) => c.id} onRowClick={() => {}} /></div>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
