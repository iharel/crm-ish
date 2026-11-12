import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  cmp: string
  title: string
  children: ReactNode
  footer?: ReactNode
  onClose?: () => void
  /** Render inline (for mockups) instead of fixed overlay. */
  inline?: boolean
  /** Wider panel (e.g. compose). */
  wide?: boolean
}

/** Modal — dialog surface. In mockups it can render inline. */
export function Modal({ cmp, title, children, footer, onClose, inline, wide }: ModalProps) {
  const panel = (
    <div data-cmp={`${cmp}.panel_div`} role="dialog" aria-modal="true" className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} flex flex-col overflow-hidden max-h-[90vh]`} style={{ boxShadow: 'var(--shadow-lg)' }}>
      <div data-cmp={`${cmp}.header_div`} className="flex items-center justify-between px-4 h-12 border-b border-border">
        <h3 data-cmp={`${cmp}.title_text`} className="font-semibold">{title}</h3>
        <button data-cmp={`${cmp}.close_button`} onClick={onClose} className="text-fg-muted hover:text-fg h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-surface-2"><X size={16} /></button>
      </div>
      <div data-cmp={`${cmp}.body_div`} className="p-4 flex flex-col gap-3 overflow-auto">{children}</div>
      {footer && <div data-cmp={`${cmp}.footer_div`} className="flex items-center justify-end gap-2 px-4 h-14 border-t border-border bg-surface-2/50">{footer}</div>}
    </div>
  )
  if (inline) return <div data-cmp={cmp} className="flex justify-center">{panel}</div>
  return (
    <div data-cmp={cmp} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>{panel}</div>
  )
}
