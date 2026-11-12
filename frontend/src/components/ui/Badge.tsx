import type { ReactNode } from 'react'
import { cn } from './cn'

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

export interface BadgeProps {
  tone?: BadgeTone
  cmp: string
  className?: string
  children: ReactNode
  /** Custom hex color (for configurable lead statuses). */
  color?: string
}

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-3 text-fg-muted',
  primary: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
  accent: 'bg-accent/15 text-accent',
}

/** Badge — small status label. */
export function Badge({ tone = 'neutral', cmp, className, children, color }: BadgeProps) {
  const style = color ? { backgroundColor: `${color}26`, color } : undefined
  return (
    <span
      data-cmp={cmp}
      style={style}
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap', !color && tones[tone], className)}
    >
      {children}
    </span>
  )
}
