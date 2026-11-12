import type { ReactNode } from 'react'

export interface EmptyStateProps {
  cmp: string
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

/** EmptyState — placeholder for empty lists. */
export function EmptyState({ cmp, icon, title, description, action }: EmptyStateProps) {
  return (
    <div data-cmp={cmp} className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon && <span data-cmp={`${cmp}.icon_span`} className="h-10 w-10 rounded-full bg-surface-3 text-fg-muted inline-flex items-center justify-center">{icon}</span>}
      <p data-cmp={`${cmp}.title_text`} className="font-medium">{title}</p>
      {description && <p data-cmp={`${cmp}.description_text`} className="text-sm text-fg-muted max-w-sm">{description}</p>}
      {action && <div data-cmp={`${cmp}.action_div`} className="mt-2">{action}</div>}
    </div>
  )
}
