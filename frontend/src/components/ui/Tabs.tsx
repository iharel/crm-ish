import { cn } from './cn'

export interface TabsProps {
  cmp: string
  tabs: Array<{ id: string; label: string; count?: number }>
  active: string
  onChange?: (id: string) => void
}

/** Tabs — underline tab strip. */
export function Tabs({ cmp, tabs, active, onChange }: TabsProps) {
  return (
    <div data-cmp={cmp} role="tablist" className="flex items-center gap-1 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          data-cmp={`${cmp}.${t.id}_tab`}
          aria-selected={t.id === active}
          onClick={() => onChange?.(t.id)}
          className={cn('relative h-9 px-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0', t.id === active ? 'text-fg' : 'text-fg-muted hover:text-fg')}
        >
          {t.label}
          {t.count !== undefined && <span data-cmp={`${cmp}.${t.id}_count`} className="ml-1.5 rounded-full bg-surface-3 px-1.5 text-[10px] text-fg-muted">{t.count}</span>}
          {t.id === active && <span data-cmp={`${cmp}.${t.id}_indicator`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
        </button>
      ))}
    </div>
  )
}
