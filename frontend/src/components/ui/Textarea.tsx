import type { TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  cmp: string
  label?: string
}

/** Textarea — multi-line text field. */
export function Textarea({ cmp, label, className, ...rest }: TextareaProps) {
  return (
    <label data-cmp={`${cmp}.wrapper_label`} className="flex flex-col gap-1.5 text-sm">
      {label && <span data-cmp={`${cmp}.label_text`} className="font-medium">{label}</span>}
      <textarea data-cmp={cmp} dir="auto" className={cn('bidi-plain min-h-24 rounded-[var(--radius)] border border-border bg-surface px-3 py-2 outline-none focus:border-ring placeholder:text-fg-subtle resize-y', className)} {...rest} />
    </label>
  )
}
