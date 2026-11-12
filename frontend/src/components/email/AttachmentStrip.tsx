import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, File, FileArchive, Paperclip, ImageOff } from 'lucide-react'
import { ImageLightbox, cn } from '../ui'
import { fileSize } from '../../lib/format'
import type { Attachment } from '../../types'

export interface AttachmentStripProps {
  cmp: string
  attachments: Attachment[]
}

function iconFor(mime: string) {
  if (mime === 'application/pdf' || mime.startsWith('text/')) return <FileText size={14} />
  if (/spreadsheet|excel|csv/.test(mime)) return <FileSpreadsheet size={14} />
  if (/zip|compressed|tar|rar/.test(mime)) return <FileArchive size={14} />
  return <File size={14} />
}

/**
 * AttachmentStrip — the non-inline files of a message: image attachments as a thumbnail gallery that opens a lightbox,
 * every other file as a chip with a download link. Thumbnails shimmer until their bytes arrive. Inline (cid) images are rendered inside the HTML body instead.
 */
export function AttachmentStrip({ cmp, attachments }: AttachmentStripProps) {
  const [open, setOpen] = useState<number | null>(null)
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set())
  const markLoaded = (id: string) => setLoaded((s) => new Set(s).add(id))
  const files = attachments.filter((a) => !a.inline)
  if (!files.length) return null
  const images = files.filter((a) => a.mime.startsWith('image/'))
  const others = files.filter((a) => !a.mime.startsWith('image/'))
  return (
    <div data-cmp={cmp} className="mt-3 flex flex-col gap-2">
      <div data-cmp={`${cmp}.head_div`} className="flex items-center gap-1 text-[11px] text-fg-subtle"><Paperclip size={11} /> {files.length} attachment{files.length === 1 ? '' : 's'}</div>
      {images.length > 0 && (
        <div data-cmp={`${cmp}.gallery_div`} className="flex flex-wrap gap-2">
          {images.map((a, i) => (
            <button key={a.id} type="button" data-cmp={`${cmp}.image_${a.id}`} title={`${a.filename} · ${fileSize(a.size)}`} onClick={() => setOpen(i)} className={cn('group relative h-28 w-36 overflow-hidden rounded-lg border border-border bg-surface-2 focus-visible:ring-2 focus-visible:ring-primary', a.available && !loaded.has(a.id) && 'skeleton')}>
              {a.available ? <img src={a.url} alt={a.filename} loading="lazy" decoding="async" onLoad={() => markLoaded(a.id)} onError={() => markLoaded(a.id)} className={cn('h-full w-full object-cover transition-[transform,opacity] group-hover:scale-[1.03]', loaded.has(a.id) ? 'opacity-100' : 'opacity-0')} /> : <span className="h-full w-full grid place-items-center text-fg-subtle"><ImageOff size={18} /></span>}
              <span dir="auto" data-cmp={`${cmp}.image_name_${a.id}`} className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-left text-[11px] text-white">{a.filename}</span>
            </button>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div data-cmp={`${cmp}.files_div`} className="flex flex-wrap gap-2">
          {others.map((a) => (
            <a key={a.id} data-cmp={`${cmp}.file_${a.id}`} href={a.url} download={a.filename} target="_blank" rel="noopener" title={`Download ${a.filename}`} className="inline-flex max-w-xs items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs hover:bg-surface-3 hover:text-fg">
              <span data-cmp={`${cmp}.file_icon_${a.id}`} className="text-fg-muted shrink-0">{iconFor(a.mime)}</span>
              <span dir="auto" data-cmp={`${cmp}.file_name_${a.id}`} className="truncate">{a.filename}</span>
              <span data-cmp={`${cmp}.file_size_${a.id}`} className="shrink-0 font-mono text-[10px] text-fg-subtle">{fileSize(a.size)}</span>
              <Download size={12} className="shrink-0 text-fg-subtle" />
            </a>
          ))}
        </div>
      )}
      {open !== null && <ImageLightbox cmp={`${cmp}.lightbox`} images={images.map((a) => ({ url: a.url, name: a.filename }))} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  )
}
