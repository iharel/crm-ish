import type { ReactNode } from 'react'

/** Hero — page-top frame with eyebrow, gradient-accented title and actions. */
export function Hero({ cmp, eyebrow, title, subtitle, actions, children }: { cmp: string; eyebrow?: string; title: ReactNode; subtitle?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div data-cmp={cmp} className="card-frame p-6 relative overflow-hidden">
      <div data-cmp={`${cmp}.row`} className="flex items-start justify-between gap-6 flex-wrap">
        <div data-cmp={`${cmp}.copy`}>
          {eyebrow && <div data-cmp={`${cmp}.eyebrow`} className="text-[11px] uppercase tracking-widest text-fg-subtle">{eyebrow}</div>}
          <h2 data-cmp={`${cmp}.title`} className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p data-cmp={`${cmp}.subtitle`} className="mt-1.5 text-sm text-fg-muted max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div data-cmp={`${cmp}.actions`} className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
