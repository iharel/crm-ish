import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  cmp: string
  title?: ReactNode
  actions?: ReactNode
  padded?: boolean
}

/** Card — elevated surface container with optional header. */
export function Card({ cmp, title, actions, padded = true, className, children, ...rest }: CardProps) {
  return (
    <div data-cmp={cmp} className={cn('card flex flex-col min-w-0', className)} {...rest}>
      {(title || actions) && (
        <div data-cmp={`${cmp}.header_div`} className="flex items-center justify-between gap-3 px-4 h-11 border-b border-border">
          <div data-cmp={`${cmp}.title_text`} className="text-sm font-semibold truncate">{title}</div>
          {actions && <div data-cmp={`${cmp}.actions_div`} className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div data-cmp={`${cmp}.body_div`} className={cn('flex-1 min-h-0', padded && 'p-4')}>{children}</div>
    </div>
  )
}
