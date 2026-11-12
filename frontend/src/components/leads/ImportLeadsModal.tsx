import { useState } from 'react'
import { FileSpreadsheet, Loader2, Upload, CheckCircle2, SkipForward, AlertTriangle } from 'lucide-react'
import { leadsApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { Badge, Button, Modal } from '../ui'
import type { ImportResult } from '../../types'

export interface ImportLeadsModalProps { onClose: () => void; onImported: (created: number) => void }

const FIELD_LABELS: Record<string, string> = { firstName: 'First name', lastName: 'Last name', name: 'Full name', email: 'Email', phone: 'Phone', title: 'Title', company: 'Company', website: 'Website', source: 'Source', notes: 'Notes', linkedinUrl: 'LinkedIn', status: 'Status' }

/** ImportLeadsModal — upload a CSV/TSV/XLSX, preview the detected columns and row actions, then import. */
export function ImportLeadsModal({ onClose, onImported }: ImportLeadsModalProps) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function pick(f: File | null) {
    setFile(f); setPreview(null); setError(null)
    if (!f) return
    setBusy('preview')
    try { setPreview(await leadsApi.importFile(f, true)) } catch (e) { setError(errorMessage(e)) } finally { setBusy(null) }
  }
  async function run() {
    if (!file) return
    setBusy('import'); setError(null)
    try { const r = await leadsApi.importFile(file, false); toast.success(`Imported ${r.created ?? 0} ${r.created === 1 ? 'lead' : 'leads'}`); onImported(r.created ?? 0) } catch (e) { setError(errorMessage(e)) } finally { setBusy(null) }
  }
  const mapped = preview ? Object.entries(preview.mapping).filter(([, h]) => h) : []

  return (
    <Modal cmp="importleads.modal" title="Import leads from a spreadsheet" onClose={onClose} footer={<><Button cmp="importleads.cancel_button" onClick={onClose}>Cancel</Button><Button cmp="importleads.run_button" variant="primary" disabled={!preview || !preview.toCreate || !!busy} icon={busy === 'import' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} onClick={() => void run()}>{busy === 'import' ? 'Importing…' : `Import ${preview?.toCreate ?? 0} ${preview?.toCreate === 1 ? 'lead' : 'leads'}`}</Button></>}>
      <label data-cmp="importleads.dropzone" className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2 p-6 text-center text-sm cursor-pointer hover:border-ring">
        <FileSpreadsheet size={22} className="text-fg-subtle" />
        <span data-cmp="importleads.dropzone_text" className="font-medium">{file ? file.name : 'Choose a .csv, .tsv or .xlsx file'}</span>
        <span data-cmp="importleads.dropzone_hint" className="text-xs text-fg-muted">First row = headers. Recognized: First name, Last name (or Name), Email, Phone, Title, Company, Website, Source, Status, Notes, LinkedIn.</span>
        <input data-cmp="importleads.file_input" type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden" onChange={(e) => void pick(e.target.files?.[0] ?? null)} />
      </label>
      {busy === 'preview' && <p data-cmp="importleads.previewing" className="text-sm text-fg-muted inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Reading file…</p>}
      {error && <p data-cmp="importleads.error_text" className="text-xs text-danger">{error}</p>}
      {preview && (
        <div data-cmp="importleads.preview" className="flex flex-col gap-3">
          <div data-cmp="importleads.summary" className="flex flex-wrap gap-2 text-xs">
            <Badge cmp="importleads.summary_create" tone="success"><CheckCircle2 size={10} /> {preview.toCreate} to create</Badge>
            <Badge cmp="importleads.summary_skip" tone="neutral"><SkipForward size={10} /> {preview.toSkip} skipped (existing)</Badge>
            {preview.errors > 0 && <Badge cmp="importleads.summary_error" tone="danger"><AlertTriangle size={10} /> {preview.errors} with errors</Badge>}
            <span data-cmp="importleads.summary_total" className="text-fg-subtle self-center">{preview.total} rows in file</span>
          </div>
          <div data-cmp="importleads.mapping" className="flex flex-wrap gap-1.5 text-[11px]">
            {mapped.map(([field, header]) => <span key={field} data-cmp={`importleads.mapping_${field}`} className="rounded-md border border-border bg-surface-2 px-2 py-0.5"><span className="text-fg-muted">{FIELD_LABELS[field] ?? field}</span> ← <span className="font-mono">{header}</span></span>)}
          </div>
          <div data-cmp="importleads.rows" className="max-h-64 overflow-auto rounded-lg border border-border">
            <table data-cmp="importleads.table" className="w-full text-xs">
              <thead data-cmp="importleads.thead"><tr data-cmp="importleads.head_row" className="text-left text-fg-subtle bg-surface-2/60 sticky top-0"><th className="px-2 py-1.5 font-medium">#</th><th className="px-2 py-1.5 font-medium">Name</th><th className="px-2 py-1.5 font-medium">Email</th><th className="px-2 py-1.5 font-medium">Company</th><th className="px-2 py-1.5 font-medium">Result</th></tr></thead>
              <tbody data-cmp="importleads.tbody">
                {preview.preview.map((r) => (
                  <tr key={r.row} data-cmp={`importleads.row_${r.row}`} className="border-t border-border">
                    <td className="px-2 py-1 text-fg-subtle font-mono">{r.row}</td>
                    <td className="px-2 py-1 truncate max-w-40">{`${r.firstName} ${r.lastName}`.trim() || '—'}</td>
                    <td dir="auto" className="px-2 py-1 font-mono truncate max-w-48">{r.email ?? '—'}</td>
                    <td className="px-2 py-1 truncate max-w-40">{r.company ?? '—'}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{r.action === 'create' ? <Badge cmp={`importleads.row_badge_${r.row}`} tone="success">Create</Badge> : r.action === 'skip' ? <Badge cmp={`importleads.row_badge_${r.row}`} tone="neutral">Skip · {r.reason}</Badge> : <Badge cmp={`importleads.row_badge_${r.row}`} tone="danger">{r.reason}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.total > preview.preview.length && <p data-cmp="importleads.more" className="p-2 text-[11px] text-fg-subtle text-center">Showing the first {preview.preview.length} of {preview.total} rows.</p>}
          </div>
        </div>
      )}
    </Modal>
  )
}
