import { cn } from './cn'

export interface AvatarProps {
  name: string
  cmp: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { xs: 'h-5 w-5 text-[9px]', sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-base' }
const palette = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#dc2626']

/** Avatar — initials bubble with deterministic color from name. */
export function Avatar({ name, cmp, size = 'md', className }: AvatarProps) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const color = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length]
  return (
    <span data-cmp={cmp} style={{ backgroundColor: `${color}33`, color }} className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', sizes[size], className)}>
      {initials}
    </span>
  )
}
