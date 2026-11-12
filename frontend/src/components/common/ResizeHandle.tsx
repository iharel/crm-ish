import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../ui'

export interface ResizeHandleProps {
  cmp: string
  /** Which side of the handle the panel sits on: dragging away from that side grows it. */
  panelSide: 'left' | 'right'
  collapsed: boolean
  label: string
  onToggle: () => void
  onDrag?: (e: ReactPointerEvent<HTMLElement>, direction: 1 | -1) => void
  onReset?: () => void
  onNudge?: (delta: number) => void
  dragging?: boolean
}

/**
 * ResizeHandle — a thin vertical separator between a side panel and the content. Drag to resize, double-click to
 * reset, Arrow keys to nudge, and a tiny centered pill button that collapses / expands the panel.
 */
export function ResizeHandle({ cmp, panelSide, collapsed, label, onToggle, onDrag, onReset, onNudge, dragging }: ResizeHandleProps) {
  const direction: 1 | -1 = panelSide === 'left' ? 1 : -1
  // Chevron points toward the panel when open (collapse) and away from it when collapsed (expand).
  const pointsLeft = panelSide === 'left' ? !collapsed : collapsed
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() }
    else if (!collapsed && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); onNudge?.((e.key === 'ArrowRight' ? 16 : -16) * direction) }
  }
  return (
    <div
      data-cmp={cmp} role="separator" aria-orientation="vertical" aria-label={`${label} width`} tabIndex={0}
      onPointerDown={collapsed ? undefined : (e) => onDrag?.(e, direction)} onDoubleClick={onReset} onKeyDown={onKey}
      className={cn('group relative z-10 w-1.5 shrink-0 self-stretch select-none transition-colors focus-visible:outline-none', collapsed ? 'cursor-default' : 'cursor-col-resize hover:bg-primary/30 focus-visible:bg-primary/30', dragging && 'bg-primary/40')}
    >
      <button
        type="button" data-cmp={`${cmp}.toggle_button`} tabIndex={-1} title={collapsed ? `Expand ${label}` : `Collapse ${label}`} aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onToggle() }}
        className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-4 grid place-items-center rounded-full border border-border bg-surface text-fg-subtle shadow-sm transition-all hover:text-primary hover:border-primary hover:scale-110', collapsed ? 'opacity-90' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100')}
      >
        {pointsLeft ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
      </button>
    </div>
  )
}
