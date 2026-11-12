import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { storageService } from '../services/storageService'

export interface PanelSizeOptions { default: number; min: number; max: number }

export interface PanelSize {
  /** Current width in px (ignored while collapsed). */
  width: number
  collapsed: boolean
  /** Inline style for the panel element: fixed width, or undefined when collapsed (render nothing). */
  style: { width: number } | undefined
  toggle: () => void
  reset: () => void
  /** Resize by a delta in px (keyboard). */
  nudge: (delta: number) => void
  /** Start a pointer drag; `direction` is +1 when dragging right grows the panel (panel on the left), −1 otherwise. */
  startDrag: (e: ReactPointerEvent<HTMLElement>, direction: 1 | -1) => void
  dragging: boolean
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)))

/**
 * usePanelSize — width + collapsed state of a resizable side panel, persisted per `name` in the prefs blob.
 * Owns the pointer-drag math (pointer capture, body cursor / selection lock) so panels only wire a ResizeHandle.
 */
export function usePanelSize(name: string, opts: PanelSizeOptions): PanelSize {
  const widthKey = `panel.${name}.width`; const collapsedKey = `panel.${name}.collapsed`
  const [width, setWidth] = useState(() => clamp(storageService.getPref(widthKey, opts.default), opts.min, opts.max))
  const [collapsed, setCollapsed] = useState(() => storageService.getPref(collapsedKey, false))
  const [dragging, setDragging] = useState(false)
  const latest = useRef(width)
  latest.current = width

  const commit = useCallback((w: number) => { const c = clamp(w, opts.min, opts.max); setWidth(c); storageService.setPref(widthKey, c); return c }, [opts.min, opts.max, widthKey])
  const toggle = useCallback(() => { setCollapsed((c) => { storageService.setPref(collapsedKey, !c); return !c }) }, [collapsedKey])
  const reset = useCallback(() => { commit(opts.default); if (collapsed) toggle() }, [commit, opts.default, collapsed, toggle])
  const nudge = useCallback((delta: number) => { commit(latest.current + delta) }, [commit])

  const startDrag = useCallback((e: ReactPointerEvent<HTMLElement>, direction: 1 | -1) => {
    if (collapsed || e.button !== 0) return
    e.preventDefault()
    const target = e.currentTarget
    const startX = e.clientX; const startW = latest.current
    target.setPointerCapture(e.pointerId)
    setDragging(true)
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
    const onMove = (ev: PointerEvent) => { setWidth(clamp(startW + (ev.clientX - startX) * direction, opts.min, opts.max)) }
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId)
      target.removeEventListener('pointermove', onMove); target.removeEventListener('pointerup', onUp); target.removeEventListener('pointercancel', onUp)
      document.body.style.cursor = ''; document.body.style.userSelect = ''
      setDragging(false)
      commit(startW + (ev.clientX - startX) * direction)
    }
    target.addEventListener('pointermove', onMove); target.addEventListener('pointerup', onUp); target.addEventListener('pointercancel', onUp)
  }, [collapsed, commit, opts.min, opts.max])

  return { width, collapsed, style: collapsed ? undefined : { width }, toggle, reset, nudge, startDrag, dragging }
}
