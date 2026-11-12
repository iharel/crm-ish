import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'

export interface VendorLinkProps {
  cmp: string
  href: string
  children: ReactNode
  className?: string
}

/** VendorLink — opens the vendor console page where a setting is created or managed, in a new tab. */
export function VendorLink({ cmp, href, children, className }: VendorLinkProps) {
  return (
    <a data-cmp={`${cmp}.vendor_link`} href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-xs text-accent hover:underline whitespace-nowrap ${className ?? ''}`}>
      {children} <ExternalLink size={11} aria-hidden="true" />
    </a>
  )
}
