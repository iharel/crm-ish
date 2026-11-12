import { Upload, Globe, FileText, RefreshCw, Trash2, Search, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Badge, Button, Card, Input, Stat, Table, type Column } from '../../components/ui'
import { sources, type MockSource } from '../data'

const statusBadge = {
  ready: { tone: 'success' as const, icon: <CheckCircle2 size={10} />, label: 'Ready' },
  processing: { tone: 'info' as const, icon: <Loader2 data-cmp="knowledge.status_spinner_icon" size={10} className="animate-spin" />, label: 'Indexing' },
  pending: { tone: 'neutral' as const, icon: <Clock size={10} />, label: 'Pending' },
  failed: { tone: 'danger' as const, icon: <AlertCircle size={10} />, label: 'Failed' },
}

/** KnowledgeMockup — documents and websites feeding the RAG index. */
export default function KnowledgeMockup() {
  const columns: Column<MockSource>[] = [
    { key: 'title', header: 'Source', render: (s) => <div data-cmp={`knowledge.source_${s.id}`} className="flex items-center gap-2"><span data-cmp={`knowledge.source_icon_${s.id}`} className="h-7 w-7 rounded bg-surface-3 inline-flex items-center justify-center text-fg-muted">{s.type === 'website' ? <Globe size={14} /> : <FileText size={14} />}</span><span data-cmp={`knowledge.source_title_${s.id}`} className={s.type === 'website' ? 'font-mono text-xs' : 'font-medium'}>{s.title}</span></div> },
    { key: 'type', header: 'Type', render: (s) => <span data-cmp={`knowledge.type_${s.id}`} className="text-fg-muted capitalize">{s.type}</span> },
    { key: 'status', header: 'Status', render: (s) => { const b = statusBadge[s.status]; return <Badge cmp={`knowledge.status_${s.id}`} tone={b.tone}>{b.icon} {b.label}</Badge> } },
    { key: 'chunks', header: 'Chunks', render: (s) => <span data-cmp={`knowledge.chunks_${s.id}`} className="font-mono text-xs">{s.chunks}</span> },
    { key: 'updated', header: 'Updated', render: (s) => <span data-cmp={`knowledge.updated_${s.id}`} className="text-xs text-fg-subtle">{s.updated}</span> },
    { key: 'actions', header: '', render: (s) => <div data-cmp={`knowledge.actions_${s.id}`} className="flex gap-1 justify-end"><Button cmp={`knowledge.reindex_${s.id}`} size="icon" variant="ghost" aria-label="Reindex"><RefreshCw size={13} /></Button><Button cmp={`knowledge.delete_${s.id}`} size="icon" variant="ghost" aria-label="Delete"><Trash2 size={13} /></Button></div> },
  ]
  return (
    <MockupFrame name="knowledge" title="Company knowledge">
      <AppShell active="knowledge" title="Company knowledge">
        <div data-cmp="knowledge.root_div" className="p-5 flex flex-col gap-4">
          <div data-cmp="knowledge.stats" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat cmp="knowledge.stat_sources" label="Sources" value="6" />
            <Stat cmp="knowledge.stat_chunks" label="Indexed chunks" value="589" />
            <Stat cmp="knowledge.stat_used" label="Used in drafts (30d)" value="212" delta="avg 2.4 citations / draft" />
            <Stat cmp="knowledge.stat_model" label="Embedding model" value="voyage-3" />
          </div>
          <div data-cmp="knowledge.add_grid" className="grid md:grid-cols-2 gap-4">
            <Card cmp="knowledge.upload_card" title="Upload documents">
              <div data-cmp="knowledge.dropzone" className="h-32 rounded-[var(--radius)] border-2 border-dashed border-border-strong flex flex-col items-center justify-center gap-1 text-sm text-fg-muted hover:border-primary hover:text-fg cursor-pointer transition-colors">
                <Upload size={18} /><span data-cmp="knowledge.dropzone_text">Drop PDF, DOCX, MD or TXT here</span><span data-cmp="knowledge.dropzone_hint" className="text-xs text-fg-subtle">up to 25 MB each</span>
              </div>
            </Card>
            <Card cmp="knowledge.website_card" title="Add website">
              <div data-cmp="knowledge.website_form" className="flex flex-col gap-3">
                <Input cmp="knowledge.website_input" placeholder="https://www.acme-demo.example" leading={<Globe size={14} />} />
                <div data-cmp="knowledge.website_opts" className="flex items-center gap-3 text-xs text-fg-muted">
                  <label data-cmp="knowledge.website_crawl_label" className="inline-flex items-center gap-1.5"><input data-cmp="knowledge.website_crawl_checkbox" type="checkbox" defaultChecked /> Crawl linked pages (same domain)</label>
                  <label data-cmp="knowledge.website_depth_label" className="inline-flex items-center gap-1.5">Depth <input data-cmp="knowledge.website_depth_input" className="w-10 h-6 rounded border border-border bg-surface px-1 font-mono" defaultValue={2} /></label>
                  <Button cmp="knowledge.website_add_button" size="sm" variant="primary" className="ml-auto">Scan</Button>
                </div>
              </div>
            </Card>
          </div>
          <Card cmp="knowledge.sources_card" title="Sources" actions={<Input cmp="knowledge.sources_search" placeholder="Filter…" className="h-8 w-48" />} padded={false}>
            <Table cmp="knowledge.table" columns={columns} rows={sources} rowKey={(s) => s.id} />
          </Card>
          <Card cmp="knowledge.test_card" title="Test retrieval" actions={<Badge cmp="knowledge.test_badge" tone="neutral">debug</Badge>}>
            <div data-cmp="knowledge.test_row" className="flex gap-2"><Input cmp="knowledge.test_input" placeholder="Ask like a prospect would: 'Do you sign a BAA?'" leading={<Search size={14} />} className="flex-1" defaultValue="Do you sign a BAA?" /><Button cmp="knowledge.test_button" variant="primary">Search</Button></div>
            <ul data-cmp="knowledge.test_results" className="mt-3 flex flex-col gap-2 text-sm">
              {[{ src: 'Security & HIPAA whitepaper.pdf', score: 0.92, text: 'Acme Demo signs a Business Associate Agreement (BAA) with all healthcare customers…' }, { src: 'Onboarding playbook.md', score: 0.71, text: 'Legal review of the BAA runs in parallel with technical onboarding…' }].map((r, i) => (
                <li key={i} data-cmp={`knowledge.test_result_${i}`} className="rounded-[var(--radius)] border border-border bg-surface-2 p-3"><div data-cmp={`knowledge.test_result_head_${i}`} className="flex justify-between text-xs mb-1"><span className="font-mono">{r.src}</span><span className="font-mono text-accent">{r.score}</span></div><p data-cmp={`knowledge.test_result_text_${i}`} className="text-fg-muted">{r.text}</p></li>
              ))}
            </ul>
          </Card>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
