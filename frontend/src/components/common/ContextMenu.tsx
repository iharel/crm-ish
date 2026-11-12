import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../ui'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  /** Inline sub-list rendered under the item (e.g. "Move to" → statuses). */
  children?: { id: string; label: string; icon?: ReactNode; onSelect: () => void }[]
  onSelect?: () => void
}

export interface ContextMenuProps {
  cmp: string
  x: number
  y: number
  items: (ContextMenuItem | 'separator')[]
  onClose: () => void
}

/** ContextMenu — right-click menu anchored at the pointer, clamped to the viewport; closes on outside click, Escape, scroll or resize. */
export function ContextMenu({ cmp, x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })
  const [openChild, setOpenChild] = useState<string | null>(null)
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ left: Math.min(x, window.innerWidth - r.width - 8), top: Math.min(y, window.innerHeight - r.height - 8) })
  }, [x, y, openChild])
  useEffect(() => {
    const down = (e: Event) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key)
    window.addEventListener('scroll', onClose, true); window.addEventListener('resize', onClose)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); window.removeEventListener('scroll', onClose, true); window.removeEventListener('resize', onClose) }
  }, [onClose])
  return createPortal(
    <div ref={ref} data-cmp={`${cmp}.menu_div`} role="menu" style={{ position: 'fixed', left: pos.left, top: pos.top }} className="fixed z-50 min-w-48 rounded-xl border border-border bg-surface shadow-xl p-1 text-sm animate-fade-in" onContextMenu={(e) => e.preventDefault()}>
      {items.map((it, i) => it === 'separator' ? <div key={`sep-${i}`} data-cmp={`${cmp}.separator_${i}`} className="my-1 h-px bg-border" /> : (
        <div key={it.id} data-cmp={`${cmp}.item_wrap_${it.id}`}>
          <button type="button" role="menuitem" data-cmp={`${cmp}.item_${it.id}`} disabled={it.disabled}
            onClick={() => { if (it.children) { setOpenChild(openChild === it.id ? null : it.id); return } it.onSelect?.(); onClose() }}
            className={cn('w-full flex items-center gap-2 px-2.5 h-8 rounded-lg text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed', it.danger ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-surface-2')}>
            {it.icon && <span data-cmp={`${cmp}.item_icon_${it.id}`} className="shrink-0 text-fg-muted">{it.icon}</span>}
            <span data-cmp={`${cmp}.item_label_${it.id}`} className="flex-1 truncate">{it.label}</span>
            {it.children && <span data-cmp={`${cmp}.item_chevron_${it.id}`} className="text-fg-subtle text-xs">{openChild === it.id ? '▾' : '▸'}</span>}
          </button>
          {it.children && openChild === it.id && (
            <div data-cmp={`${cmp}.children_${it.id}`} className="ml-3 pl-2 border-l border-border my-0.5 flex flex-col">
              {it.children.map((c) => <button key={c.id} type="button" role="menuitem" data-cmp={`${cmp}.child_${it.id}_${c.id}`} onClick={() => { c.onSelect(); onClose() }} className="flex items-center gap-2 px-2.5 h-7 rounded-lg text-left text-xs hover:bg-surface-2">{c.icon}<span dir="auto" className="truncate">{c.label}</span></button>)}
            </div>
          )}
        </div>
      ))}
    </div>,
    document.body,
  )
}
