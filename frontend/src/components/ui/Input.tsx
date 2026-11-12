import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  cmp: string
  label?: string
  hint?: ReactNode
  error?: string
  leading?: ReactNode
}

/** Input — text field with optional label, hint, error and leading icon. */
export function Input({ cmp, label, hint, error, leading, className, ...rest }: InputProps) {
  return (
    <label data-cmp={`${cmp}.wrapper_label`} className="flex flex-col gap-1.5 text-sm">
      {label && <span data-cmp={`${cmp}.label_text`} className="font-medium text-fg">{label}</span>}
      <span data-cmp={`${cmp}.field_span`} className={cn('flex items-center gap-2 h-9 px-3 rounded-[var(--radius)] border bg-surface transition-colors focus-within:border-ring', error ? 'border-danger' : 'border-border', className)}>
        {leading && <span data-cmp={`${cmp}.leading_span`} className="text-fg-subtle shrink-0">{leading}</span>}
        <input data-cmp={cmp} dir="auto" className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-fg-subtle" {...rest} />
      </span>
      {error ? <span data-cmp={`${cmp}.error_text`} className="text-xs text-danger">{error}</span>
        : hint ? <span data-cmp={`${cmp}.hint_text`} className="text-xs text-fg-subtle">{hint}</span> : null}
    </label>
  )
}
