import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from './cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  cmp: string
  label?: string
  options: Array<{ value: string; label: string }>
}

/** Select — native select styled to match Input. */
export function Select({ cmp, label, options, className, ...rest }: SelectProps) {
  return (
    <label data-cmp={`${cmp}.wrapper_label`} className="flex flex-col gap-1.5 text-sm">
      {label && <span data-cmp={`${cmp}.label_text`} className="font-medium">{label}</span>}
      <span data-cmp={`${cmp}.field_span`} className={cn('relative flex items-center h-9 rounded-[var(--radius)] border border-border bg-surface focus-within:border-ring', className)}>
        <select data-cmp={cmp} className="appearance-none flex-1 h-full bg-transparent pl-3 pr-8 outline-none" {...rest}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown data-cmp={`${cmp}.chevron_icon`} size={14} className="absolute right-2.5 text-fg-subtle pointer-events-none" />
      </span>
    </label>
  )
}
