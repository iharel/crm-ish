import { useRef, useState } from 'react'
import { Upload, Globe, FileText, RefreshCw, Trash2, Search, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react'
import { knowledgeApi } from '../api'
import { errorMessage } from '../api/apiError'
import { AppShell } from '../components/shell/AppShell'
import { Hero } from '../components/common/Hero'
import { PageState } from '../components/common/PageState'
import { Badge, Button, Card, Input, Table, type Column } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { timeAgo } from '../lib/format'
import type { Citation, KnowledgeSource } from '../types'

const statusBadge: Record<string, { tone: 'success' | 'info' | 'neutral' | 'danger'; icon: React.ReactNode; label: string }> = {
  ready: { tone: 'success', icon: <CheckCircle2 size={10} />, label: 'Ready' }, processing: { tone: 'info', icon: <Loader2 size={10} className="animate-spin" />, label: 'Indexing' },
  pending: { tone: 'neutral', icon: <Clock size={10} />, label: 'Pending' }, failed: { tone: 'danger', icon: <AlertCircle size={10} />, label: 'Failed' },
}

/** KnowledgePage — documents & websites feeding the RAG index; retrieval tester. */
export default function KnowledgePage() {
  const toast = useToast(); const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useAsync(() => knowledgeApi.list())
  const [url, setUrl] = useState(''); const [crawl, setCrawl] = useState(true); const [depth, setDepth] = useState(2)
  const [query, setQuery] = useState(''); const [results, setResults] = useState<Citation[] | null>(null); const [busy, setBusy] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useSocketEvent('knowledge:status', () => void reload(true))
  async function upload(files: FileList | null) { if (!files?.length) return; setBusy('upload'); try { await knowledgeApi.upload([...files]); toast.success(`${files.length} file(s) queued for indexing`); await reload(true) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) } }
  async function addSite() { if (!url) return; setBusy('site'); try { await knowledgeApi.website(url, crawl, depth); setUrl(''); toast.success('Website queued for scanning'); await reload(true) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) } }
  async function search() { if (!query.trim()) return; setBusy('search'); try { setResults(await knowledgeApi.search(query)) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) } }
  const columns: Column<KnowledgeSource>[] = [
    { key: 'title', header: 'Source', render: (s) => <div data-cmp={`knowledge.source_${s.id}`} className="flex items-center gap-2"><span data-cmp={`knowledge.source_icon_${s.id}`} className="h-7 w-7 rounded-lg bg-surface-3 grid place-items-center text-fg-muted">{s.type === 'website' ? <Globe size={14} /> : <FileText size={14} />}</span><div data-cmp={`knowledge.source_meta_${s.id}`}><div dir="auto" data-cmp={`knowledge.source_title_${s.id}`} className={s.type === 'website' ? 'font-mono text-xs' : 'font-medium'}>{s.title}</div>{s.error && <div data-cmp={`knowledge.source_error_${s.id}`} className="text-xs text-danger">{s.error}</div>}</div></div> },
    { key: 'type', header: 'Type', render: (s) => <span data-cmp={`knowledge.type_${s.id}`} className="text-fg-muted capitalize">{s.type}</span> },
    { key: 'status', header: 'Status', render: (s) => { const b = statusBadge[s.status] ?? statusBadge.pending; return <Badge cmp={`knowledge.status_${s.id}`} tone={b.tone}>{b.icon} {b.label}</Badge> } },
    { key: 'chunks', header: 'Chunks', render: (s) => <span data-cmp={`knowledge.chunks_${s.id}`} className="font-mono text-xs">{s.chunkCount}</span> },
    { key: 'updated', header: 'Updated', render: (s) => <span data-cmp={`knowledge.updated_${s.id}`} className="text-xs text-fg-subtle">{timeAgo(s.updatedAt)}</span> },
    { key: 'actions', header: '', render: (s) => isAdmin ? <div data-cmp={`knowledge.actions_${s.id}`} className="flex gap-1 justify-end"><Button cmp={`knowledge.reindex_${s.id}`} size="icon" variant="ghost" aria-label="Reindex" onClick={() => knowledgeApi.reindex(s.id).then(() => reload(true)).catch((e) => toast.error(errorMessage(e)))}><RefreshCw size={13} /></Button><Button cmp={`knowledge.delete_${s.id}`} size="icon" variant="ghost" aria-label="Delete" onClick={() => { if (confirm('Delete this source?')) knowledgeApi.remove(s.id).then(() => reload(true)).catch((e) => toast.error(errorMessage(e))) }}><Trash2 size={13} /></Button></div> : null },
  ]
  return (
    <AppShell title="Company knowledge">
      <div data-cmp="knowledge.root_div" className="p-6 space-y-5 animate-fade-in">
        <Hero cmp="knowledge.hero" eyebrow="Retrieval-augmented replies" title={<>Teach the AI <span className="text-brand-gradient">your company</span>.</>} subtitle="Upload documents and scan your website. Every suggested reply is grounded on these sources and cites them.">
          {data && <div data-cmp="knowledge.stats" className="grid grid-cols-3 gap-3 mt-5">{[['Sources', data.stats.sources], ['Indexed chunks', data.stats.chunks], ['Embedding model', data.stats.embeddingModel]].map(([l, v]) => <div key={l} data-cmp={`knowledge.stat_${l}`} className="card p-4"><div data-cmp={`knowledge.stat_label_${l}`} className="text-xs text-fg-muted">{l}</div><div data-cmp={`knowledge.stat_value_${l}`} className="mt-1 text-xl font-semibold font-mono truncate">{v}</div></div>)}</div>}
        </Hero>
        {isAdmin && (
          <div data-cmp="knowledge.add_grid" className="grid md:grid-cols-2 gap-5">
            <Card cmp="knowledge.upload_card" title="Upload documents">
              <input ref={fileRef} data-cmp="knowledge.file_input" type="file" multiple accept=".pdf,.docx,.md,.txt,.html" className="hidden" onChange={(e) => void upload(e.target.files)} />
              <div data-cmp="knowledge.dropzone" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void upload(e.dataTransfer.files) }} className="h-32 rounded-xl border-2 border-dashed border-border-strong flex flex-col items-center justify-center gap-1 text-sm text-fg-muted hover:border-primary hover:text-fg cursor-pointer transition-colors">
                {busy === 'upload' ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}<span data-cmp="knowledge.dropzone_text">Drop PDF, DOCX, MD or TXT here, or click</span><span data-cmp="knowledge.dropzone_hint" className="text-xs text-fg-subtle">up to 25 MB each</span>
              </div>
            </Card>
            <Card cmp="knowledge.website_card" title="Scan a website">
              <div data-cmp="knowledge.website_form" className="flex flex-col gap-3">
                <Input cmp="knowledge.website_input" placeholder="https://www.yourcompany.com" value={url} onChange={(e) => setUrl(e.target.value)} leading={<Globe size={14} />} />
                <div data-cmp="knowledge.website_opts" className="flex items-center gap-3 text-xs text-fg-muted flex-wrap">
                  <label data-cmp="knowledge.website_crawl_label" className="inline-flex items-center gap-1.5"><input data-cmp="knowledge.website_crawl_checkbox" type="checkbox" checked={crawl} onChange={(e) => setCrawl(e.target.checked)} /> Crawl linked pages (same domain)</label>
                  <label data-cmp="knowledge.website_depth_label" className="inline-flex items-center gap-1.5">Depth <input data-cmp="knowledge.website_depth_input" type="number" min={0} max={3} className="w-12 h-6 rounded border border-border bg-surface px-1 font-mono" value={depth} onChange={(e) => setDepth(Number(e.target.value))} /></label>
                  <Button cmp="knowledge.website_add_button" size="sm" variant="primary" className="ml-auto" disabled={busy === 'site' || !url} onClick={() => void addSite()}>{busy === 'site' ? 'Queuing…' : 'Scan'}</Button>
                </div>
              </div>
            </Card>
          </div>
        )}
        {loading && !data ? <PageState cmp="knowledge" loading /> : error ? <PageState cmp="knowledge" error={error} onRetry={() => void reload()} /> : (
          <Card cmp="knowledge.sources_card" title="Sources" padded={false}><Table cmp="knowledge.table" columns={columns} rows={data?.sources ?? []} rowKey={(s) => s.id} />{data && !data.sources.length && <p data-cmp="knowledge.empty" className="p-8 text-center text-sm text-fg-muted">No sources yet. {isAdmin ? 'Upload a document or scan your website.' : 'Ask an admin to add company knowledge.'}</p>}</Card>
        )}
        <Card cmp="knowledge.test_card" title="Test retrieval" actions={<Badge cmp="knowledge.test_badge">what the AI would see</Badge>}>
          <form data-cmp="knowledge.test_form" onSubmit={(e) => { e.preventDefault(); void search() }} className="flex gap-2"><Input cmp="knowledge.test_input" placeholder="Ask like a prospect would: 'Do you sign a BAA?'" leading={<Search size={14} />} className="flex-1" value={query} onChange={(e) => setQuery(e.target.value)} /><Button cmp="knowledge.test_button" variant="primary" type="submit" disabled={busy === 'search'}>Search</Button></form>
          {results && <ul data-cmp="knowledge.test_results" className="mt-3 flex flex-col gap-2 text-sm">{results.map((r, i) => <li key={i} data-cmp={`knowledge.test_result_${i}`} className="rounded-lg border border-border bg-surface-2 p-3"><div data-cmp={`knowledge.test_result_head_${i}`} className="flex justify-between text-xs mb-1"><span dir="auto" className="font-mono">{r.sourceTitle}</span><span className="font-mono text-accent">{r.score}</span></div><p dir="auto" data-cmp={`knowledge.test_result_text_${i}`} className="text-fg-muted">{r.snippet}</p></li>)}{!results.length && <li data-cmp="knowledge.test_empty" className="text-fg-muted">No matching chunks.</li>}</ul>}
        </Card>
      </div>
    </AppShell>
  )
}
