import { Filter, LayoutList, Kanban, Plus, Download, Sparkles } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Avatar, Badge, Button, Input, Select, Table, type Column } from '../../components/ui'
import { byId, leads, statuses, users, type MockLead } from '../data'

/** LeadsListMockup — dense filterable table. */
export default function LeadsListMockup() {
  const columns: Column<MockLead>[] = [
    { key: 'select', header: <input data-cmp="leads.list_select_all" type="checkbox" />, render: (l) => <input data-cmp={`leads.list_select_${l.id}`} type="checkbox" />, className: 'w-8' },
    { key: 'name', header: 'Lead', render: (l) => <div data-cmp={`leads.list_name_${l.id}`} className="flex items-center gap-2"><Avatar cmp={`leads.list_avatar_${l.id}`} name={l.name} size="sm" /><div data-cmp={`leads.list_meta_${l.id}`}><div data-cmp={`leads.list_fullname_${l.id}`} className="font-medium">{l.name}</div><div data-cmp={`leads.list_email_${l.id}`} className="text-xs text-fg-muted">{l.email}</div></div></div> },
    { key: 'title', header: 'Title', render: (l) => <span data-cmp={`leads.list_title_${l.id}`} className="text-fg-muted">{l.title}</span> },
    { key: 'company', header: 'Company', render: (l) => <span data-cmp={`leads.list_company_${l.id}`}>{byId.company(l.companyId).name}</span> },
    { key: 'status', header: 'Status', render: (l) => { const s = byId.status(l.statusId); return <Badge cmp={`leads.list_status_${l.id}`} color={s.color}>{s.name}</Badge> } },
    { key: 'score', header: 'Score', render: (l) => <span data-cmp={`leads.list_score_${l.id}`} className="font-mono text-accent">{l.score}</span>, className: 'w-16' },
    { key: 'source', header: 'Source', render: (l) => <span data-cmp={`leads.list_source_${l.id}`} className="text-fg-muted">{l.source}</span> },
    { key: 'owner', header: 'Owner', render: (l) => <Avatar cmp={`leads.list_owner_${l.id}`} name={byId.user(l.ownerId).name} size="xs" /> },
    { key: 'enriched', header: 'AI', render: (l) => l.enriched ? <Sparkles data-cmp={`leads.list_enriched_${l.id}`} size={14} className="text-accent" /> : <span data-cmp={`leads.list_enriched_${l.id}`} className="text-fg-subtle">—</span>, className: 'w-10' },
    { key: 'activity', header: 'Last activity', render: (l) => <span data-cmp={`leads.list_activity_${l.id}`} className="text-fg-subtle text-xs">{l.lastActivity}</span> },
  ]
  return (
    <MockupFrame name="leads-list" title="Leads — List">
      <AppShell active="leads" title="Leads" actions={
        <>
          <div data-cmp="leads.view_switch" className="inline-flex rounded-[var(--radius)] border border-border overflow-hidden">
            <button data-cmp="leads.view_kanban_button" className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs text-fg-muted hover:bg-surface-2"><Kanban size={13} /> Kanban</button>
            <button data-cmp="leads.view_list_button" aria-pressed className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary"><LayoutList size={13} /> List</button>
          </div>
          <Button cmp="leads.export_button" size="sm" icon={<Download size={13} />}>Export</Button>
          <Button cmp="leads.add_button" size="sm" variant="primary" icon={<Plus size={13} />}>New lead</Button>
        </>
      }>
        <div data-cmp="leads.list_root" className="p-4 flex flex-col gap-3 h-full">
          <div data-cmp="leads.list_filters" className="flex items-end gap-3 flex-wrap">
            <Input cmp="leads.list_search_input" placeholder="Search name, email, company…" className="w-72" />
            <Select cmp="leads.list_status_select" options={[{ value: '', label: 'All statuses' }, ...statuses.map((s) => ({ value: s.id, label: s.name }))]} className="w-40" />
            <Select cmp="leads.list_owner_select" options={[{ value: '', label: 'Any owner' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} className="w-40" />
            <Button cmp="leads.list_more_filters_button" size="md" variant="ghost" icon={<Filter size={13} />}>More</Button>
            <span data-cmp="leads.list_count_text" className="ml-auto text-xs text-fg-subtle">{leads.length} leads</span>
          </div>
          <div data-cmp="leads.list_table_card" className="card flex-1 min-h-0 overflow-hidden">
            <Table cmp="leads.list_table" columns={columns} rows={leads} rowKey={(l) => l.id} onRowClick={() => {}} />
          </div>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
