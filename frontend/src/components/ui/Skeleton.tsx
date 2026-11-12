import { cn } from './cn'

export interface SkeletonProps {
  cmp: string
  /** Tailwind sizing/shape classes, e.g. "h-3 w-32" or "h-8 w-8 rounded-full". */
  className?: string
}

/** Skeleton — one shimmering placeholder block for inner loading states. Decorative: hidden from assistive tech. */
export function Skeleton({ cmp, className }: SkeletonProps) {
  return <span data-cmp={cmp} aria-hidden="true" className={cn('skeleton block rounded-md', className)} />
}
