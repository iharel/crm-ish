import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  /** Unique data-cmp id, e.g. `leads.add_button`. */
  cmp: string
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover border-transparent',
  secondary: 'bg-surface text-fg hover:bg-surface-2 border-border',
  ghost: 'bg-transparent text-fg-muted hover:text-fg hover:bg-surface-2 border-transparent',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20 border-transparent',
  accent: 'bg-accent text-on-primary hover:opacity-90 border-transparent',
}
const sizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9 p-0 justify-center',
}

/** Button — primary interactive control. */
export function Button({ variant = 'secondary', size = 'md', icon, cmp, className, children, ...rest }: ButtonProps) {
  return (
    <button
      data-cmp={cmp}
      className={cn(
        'inline-flex items-center rounded-[var(--radius)] border font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
