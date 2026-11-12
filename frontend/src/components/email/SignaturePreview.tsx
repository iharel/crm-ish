import { Fragment } from 'react'
import { cn } from '../ui'

export interface SignaturePreviewProps {
  cmp: string
  text: string
  /** Faded look, e.g. when the signature is switched off for this email. */
  muted?: boolean
}

const LINK = /(https?:\/\/[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g

/** SignaturePreview — the signature as recipients will see it: "-- " delimiter, line breaks, links made clickable. */
export function SignaturePreview({ cmp, text, muted }: SignaturePreviewProps) {
  return (
    <div dir="auto" data-cmp={cmp} className={cn('text-sm leading-relaxed text-fg-muted whitespace-pre-wrap', muted && 'opacity-40 line-through decoration-fg-subtle/40')}>
      <span data-cmp={`${cmp}.delimiter`} className="text-fg-subtle">-- </span>{'\n'}
      {text.split(LINK).map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
        const href = part.includes('@') && !part.startsWith('http') ? `mailto:${part}` : part
        return <a key={i} data-cmp={`${cmp}.link_${i}`} href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{part}</a>
      })}
    </div>
  )
}
