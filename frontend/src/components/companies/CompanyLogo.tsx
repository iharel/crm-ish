import { useState } from 'react'
import { cn } from '../ui'

export interface CompanyLogoProps {
  cmp: string
  name: string
  logoUrl: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'h-8 w-8 text-xs rounded-lg', md: 'h-10 w-10 text-sm rounded-xl', lg: 'h-14 w-14 text-base rounded-2xl' }

/** CompanyLogo — company logo image with an initials tile fallback when there is no URL or it fails to load. */
export function CompanyLogo({ cmp, name, logoUrl, size = 'md', className }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false)
  if (logoUrl && !failed) {
    return <span data-cmp={cmp} className={cn('shrink-0 grid place-items-center overflow-hidden border border-border bg-white', sizes[size], className)}><img data-cmp={`${cmp}.img`} src={logoUrl} alt={`${name} logo`} className="h-[70%] w-[70%] object-contain" loading="lazy" onError={() => setFailed(true)} /></span>
  }
  return <span dir="auto" data-cmp={cmp} className={cn('shrink-0 grid place-items-center bg-brand-gradient text-white font-bold', sizes[size], className)}>{name.slice(0, 2).toUpperCase()}</span>
}
