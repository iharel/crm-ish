import { ArrowDown, ArrowUp, FileText, Trash2, Upload } from 'lucide-react'
import { fileSize } from '../../lib/signing'
import type { SignDocument } from '../../types'
import { cn } from '../ui'

export interface DocumentListProps {
  cmp: string
  documents: SignDocument[]
  uploading: boolean
  onUpload: (files: File[]) => void
  onRemove: (doc: SignDocument) => void
  /** New order as document ids. */
  onReorder: (ids: string[]) => void
}

/** DocumentList — the PDFs of a request in signing order: add (button or drop), reorder, remove. */
export function DocumentList({ cmp, documents, uploading, onUpload, onRemove, onReorder }: DocumentListProps) {
  const pick = (list: FileList | null) => { const files = [...(list ?? [])].filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')); if (files.length) onUpload(files) }
  const swap = (i: number, j: number) => { const ids = documents.map((d) => d.id); [ids[i], ids[j]] = [ids[j], ids[i]]; onReorder(ids) }
  return (
    <div data-cmp={cmp} className="flex flex-col gap-2">
      {documents.map((d, i) => (
        <div key={d.id} data-cmp={`${cmp}.row_${d.id}`} className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5">
          <FileText size={14} className="text-fg-subtle shrink-0" />
          <div data-cmp={`${cmp}.meta_${d.id}`} className="min-w-0 flex-1">
            <div data-cmp={`${cmp}.name_${d.id}`} dir="auto" className="text-sm truncate" title={d.filename}>{i + 1}. {d.filename}</div>
            <div data-cmp={`${cmp}.info_${d.id}`} className="text-[11px] text-fg-subtle">{d.pageCount} page{d.pageCount === 1 ? '' : 's'} · {fileSize(d.size)}</div>
          </div>
          <button type="button" data-cmp={`${cmp}.up_button_${d.id}`} title="Move up" disabled={i === 0} onClick={() => swap(i, i - 1)} className="text-fg-subtle hover:text-fg disabled:opacity-30"><ArrowUp size={13} /></button>
          <button type="button" data-cmp={`${cmp}.down_button_${d.id}`} title="Move down" disabled={i === documents.length - 1} onClick={() => swap(i, i + 1)} className="text-fg-subtle hover:text-fg disabled:opacity-30"><ArrowDown size={13} /></button>
          <button type="button" data-cmp={`${cmp}.remove_button_${d.id}`} title="Remove (its fields go with it)" onClick={() => onRemove(d)} className="text-fg-subtle hover:text-danger"><Trash2 size={13} /></button>
        </div>
      ))}
      <label data-cmp={`${cmp}.upload_label`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files) }} className={cn('flex items-center justify-center gap-2 h-14 rounded-[var(--radius)] border border-dashed border-border-strong text-sm text-fg-muted hover:text-fg hover:bg-surface-2 cursor-pointer', uploading && 'opacity-60 pointer-events-none')}>
        <Upload size={14} /> {uploading ? 'Uploading…' : documents.length ? 'Add another PDF' : 'Upload PDFs (or drop them here)'}
        <input data-cmp={`${cmp}.upload_input`} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
      </label>
      <p data-cmp={`${cmp}.hint`} className="text-[11px] text-fg-subtle">Up to 10 files. Signers see them as one document in this order, and get one signed PDF back.</p>
    </div>
  )
}
