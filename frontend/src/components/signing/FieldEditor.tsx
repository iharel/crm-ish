import { FileText } from 'lucide-react'
import { FIELD_TYPES, signerColor } from '../../lib/signing'
import type { LoadedPdf } from '../../hooks/usePdfDocuments'
import type { SignDocument, SignFieldInput, SignFieldType } from '../../types'
import { FieldBox } from './FieldBox'
import { PdfPage } from './PdfPage'

/** A field while it is being edited: the saved shape plus a stable local key. */
export type EditorField = SignFieldInput & { key: string }
export interface FieldEditorSigner { id: string; name: string; colorIndex: number }
export interface FieldEditorProps {
  cmp: string
  documents: SignDocument[]
  pdfs: Record<string, LoadedPdf>
  signers: FieldEditorSigner[]
  fields: EditorField[]
  /** Page width in CSS pixels. */
  width: number
  /** When set, the next click on a page places a field of this type for `activeSignerId`. */
  armedType: SignFieldType | null
  activeSignerId: string | null
  selectedKey: string | null
  onSelect: (key: string | null) => void
  onChange: (fields: EditorField[]) => void
  onPlaced: () => void
}

/**
 * FieldEditor — every page of every document, in order, with the fields laid over them. Click a page to place the
 * armed field type; drag a field to move it, drag its corner to resize it.
 */
export function FieldEditor({ cmp, documents, pdfs, signers, fields, width, armedType, activeSignerId, selectedKey, onSelect, onChange, onPlaced }: FieldEditorProps) {
  const signerById = new Map(signers.map((s) => [s.id, s]))
  function place(e: React.PointerEvent<HTMLDivElement>, documentId: string, page: number) {
    if (!armedType || !activeSignerId) { onSelect(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const def = FIELD_TYPES.find((f) => f.type === armedType)!
    // Keep the box the same visual size on any page shape: the defaults assume a portrait page.
    const h = Math.min(0.5, def.h * (rect.width / rect.height) * 1.414)
    const x = Math.min(1 - def.w, Math.max(0, (e.clientX - rect.left) / rect.width - def.w / 2))
    const y = Math.min(1 - h, Math.max(0, (e.clientY - rect.top) / rect.height - h / 2))
    const key = `new-${Date.now()}-${Math.round(Math.random() * 1e6)}`
    onChange([...fields, { key, documentId, recipientId: activeSignerId, type: armedType, page, x, y, w: def.w, h, required: true, label: null }])
    onSelect(key)
    onPlaced()
  }
  return (
    <div data-cmp={cmp} className="flex flex-col items-center gap-4 py-4">
      {documents.map((d, di) => {
        const pdf = pdfs[d.id]
        return (
          <div key={d.id} data-cmp={`${cmp}.document_${d.id}`} className="flex flex-col items-center gap-3">
            <div data-cmp={`${cmp}.document_title_${d.id}`} style={{ width }} className="flex items-center gap-2 text-xs text-fg-muted"><FileText size={12} /><span data-cmp={`${cmp}.document_name_${d.id}`} className="font-medium text-fg truncate">{di + 1}. {d.filename}</span><span data-cmp={`${cmp}.document_pages_${d.id}`} className="ml-auto shrink-0">{d.pageCount} page{d.pageCount === 1 ? '' : 's'}</span></div>
            {!pdf ? <div data-cmp={`${cmp}.document_loading_${d.id}`} style={{ width, height: Math.round(width * 1.3) }} className="rounded-sm bg-surface-3 animate-pulse" /> : pdf.sizes.map((size, i) => {
              const page = i + 1; const height = Math.round((width * size.height) / size.width)
              return (
                <PdfPage key={page} cmp={`${cmp}.page_${d.id}_${page}`} doc={pdf.doc} pageNumber={page} size={size} width={width} onPointerDown={(e) => place(e, d.id, page)} className={armedType ? 'cursor-crosshair' : undefined}>
                  {fields.filter((f) => f.documentId === d.id && f.page === page).map((f) => {
                    const signer = signerById.get(f.recipientId)
                    return <FieldBox key={f.key} cmp={`${cmp}.field_${f.key}`} field={f} color={signerColor(signer?.colorIndex ?? 0)} owner={signer?.name ?? 'Unassigned'} pageWidth={width} pageHeight={height} selected={selectedKey === f.key} onSelect={() => onSelect(f.key)} onChange={(patch) => onChange(fields.map((x) => (x.key === f.key ? { ...x, ...patch } : x)))} />
                  })}
                </PdfPage>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
