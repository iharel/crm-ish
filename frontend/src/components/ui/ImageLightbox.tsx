import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'

export interface LightboxImage { url: string; name: string }

export interface ImageLightboxProps {
  cmp: string
  images: LightboxImage[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}

/** ImageLightbox — full-screen image viewer with prev/next, download and keyboard navigation. */
export function ImageLightbox({ cmp, images, index, onIndex, onClose }: ImageLightboxProps) {
  const img = images[index]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && index < images.length - 1) onIndex(index + 1)
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onClose, onIndex])
  if (!img) return null
  return (
    <div data-cmp={cmp} role="dialog" aria-modal="true" aria-label={img.name} className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div data-cmp={`${cmp}.bar_div`} className="h-12 px-4 flex items-center gap-2 text-white/90 text-sm">
        <span dir="auto" data-cmp={`${cmp}.name_text`} className="truncate flex-1">{img.name}</span>
        <span data-cmp={`${cmp}.count_text`} className="text-white/60 text-xs">{index + 1} / {images.length}</span>
        <a data-cmp={`${cmp}.download_link`} href={img.url} download={img.name} title="Download" className="h-8 w-8 grid place-items-center rounded-md hover:bg-white/10"><Download size={16} /></a>
        <button type="button" data-cmp={`${cmp}.close_button`} onClick={onClose} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-md hover:bg-white/10"><X size={16} /></button>
      </div>
      <div data-cmp={`${cmp}.stage_div`} className="flex-1 min-h-0 flex items-center justify-center p-4 relative" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
        {index > 0 && <button type="button" data-cmp={`${cmp}.prev_button`} onClick={() => onIndex(index - 1)} aria-label="Previous image" className="absolute left-3 h-10 w-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft size={18} /></button>}
        <img data-cmp={`${cmp}.image_img`} src={img.url} alt={img.name} className="max-h-full max-w-full object-contain rounded-md shadow-2xl" />
        {index < images.length - 1 && <button type="button" data-cmp={`${cmp}.next_button`} onClick={() => onIndex(index + 1)} aria-label="Next image" className="absolute right-3 h-10 w-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight size={18} /></button>}
      </div>
    </div>
  )
}
