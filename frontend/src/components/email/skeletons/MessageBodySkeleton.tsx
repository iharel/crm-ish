import { Skeleton } from '../../ui'

export interface MessageBodySkeletonProps {
  cmp: string
}

/** MessageBodySkeleton — shimmer text lines for one expanded message whose HTML is still loading and that has no plain text to show meanwhile. */
export function MessageBodySkeleton({ cmp }: MessageBodySkeletonProps) {
  return (
    <div data-cmp={cmp} aria-busy="true" aria-label="Loading message" className="flex flex-col gap-2 py-1">
      {['w-full', 'w-11/12', 'w-4/5', 'w-2/3'].map((w, i) => <Skeleton key={i} cmp={`${cmp}.line_${i}`} className={`h-3 ${w}`} />)}
    </div>
  )
}
