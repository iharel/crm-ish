import type { MouseEvent } from 'react'
import type { ReactNode } from 'react'
import { cn } from './cn'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
}

export interface TableProps<T> {
  cmp: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  /** Right-click on a row (e.g. to open a ContextMenu). */
  onRowContextMenu?: (e: MouseEvent<HTMLTableRowElement>, row: T) => void
}

/** Table — dense data table. */
export function Table<T>({ cmp, columns, rows, rowKey, onRowClick, onRowContextMenu }: TableProps<T>) {
  return (
    <div data-cmp={cmp} className="overflow-auto max-h-full">
      <table data-cmp={`${cmp}.table`} className="w-full text-sm">
        <thead data-cmp={`${cmp}.thead`}>
          <tr data-cmp={`${cmp}.header_row`} className="text-left text-xs uppercase tracking-wide text-fg-subtle">
            {columns.map((c) => (
              <th key={c.key} data-cmp={`${cmp}.${c.key}_th`} className={cn('px-3 py-2 font-medium border-b border-border bg-surface-2/60 sticky top-0', c.className)}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody data-cmp={`${cmp}.tbody`}>
          {rows.map((r) => {
            const k = rowKey(r)
            return (
              <tr key={k} data-cmp={`${cmp}.row_${k}`} onClick={() => onRowClick?.(r)} onContextMenu={onRowContextMenu ? (e) => onRowContextMenu(e, r) : undefined} className={cn('border-b border-border last:border-0 transition-colors', onRowClick && 'hover:bg-surface-2 cursor-pointer')}>
                {columns.map((c) => <td key={c.key} data-cmp={`${cmp}.row_${k}.${c.key}_td`} className={cn('px-3 py-2.5 align-middle', c.className)}>{c.render(r)}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
