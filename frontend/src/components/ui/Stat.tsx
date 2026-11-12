import type { ReactNode } from 'react'
import { cn } from './cn'

export interface StatProps {
  cmp: string
  label: string
  value: string
  delta?: string
  deltaTone?: 'up' | 'down' | 'flat'
  icon?: ReactNode
}

/** Stat — KPI tile. */
export function Stat({ cmp, label, value, delta, deltaTone = 'flat', icon }: StatProps) {
  return (
    <div data-cmp={cmp} className="card p-4 flex items-start justify-between gap-3">
      <div data-cmp={`${cmp}.content_div`} className="flex flex-col gap-1 min-w-0">
        <span data-cmp={`${cmp}.label_text`} className="text-xs text-fg-muted">{label}</span>
        <span data-cmp={`${cmp}.value_text`} className="text-2xl font-semibold tracking-tight font-mono">{value}</span>
        {delta && <span data-cmp={`${cmp}.delta_text`} className={cn('text-xs', deltaTone === 'up' && 'text-success', deltaTone === 'down' && 'text-danger', deltaTone === 'flat' && 'text-fg-subtle')}>{delta}</span>}
      </div>
      {icon && <span data-cmp={`${cmp}.icon_span`} className="h-9 w-9 rounded-[var(--radius)] bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">{icon}</span>}
    </div>
  )
}
