import { useCallback, useState, type MouseEvent } from 'react'

export interface ContextMenuState<T> { x: number; y: number; target: T }

/** useContextMenu — pointer-anchored menu state for right-click on list items. */
export function useContextMenu<T>() {
  const [menu, setMenu] = useState<ContextMenuState<T> | null>(null)
  const open = useCallback((e: MouseEvent, target: T) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, target }) }, [])
  const close = useCallback(() => setMenu(null), [])
  return { menu, open, close }
}
