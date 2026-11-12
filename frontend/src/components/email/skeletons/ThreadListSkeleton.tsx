import { Skeleton } from '../../ui'

/** ThreadListSkeleton — shimmer rows shown while the thread list loads. */
export function ThreadListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} data-cmp={`inbox.thread_skeleton_${i}`} aria-hidden="true" className="p-3 flex gap-3">
          <Skeleton cmp={`inbox.thread_skeleton_avatar_${i}`} className="h-7 w-7 rounded-full shrink-0" />
          <div data-cmp={`inbox.thread_skeleton_lines_${i}`} className="flex-1 min-w-0 flex flex-col gap-1.5 pt-0.5">
            <div data-cmp={`inbox.thread_skeleton_top_${i}`} className="flex justify-between gap-3"><Skeleton cmp={`inbox.thread_skeleton_name_${i}`} className="h-3 w-28" /><Skeleton cmp={`inbox.thread_skeleton_time_${i}`} className="h-2.5 w-10" /></div>
            <Skeleton cmp={`inbox.thread_skeleton_subject_${i}`} className={i % 2 ? 'h-2.5 w-3/4' : 'h-2.5 w-2/3'} />
            <Skeleton cmp={`inbox.thread_skeleton_snippet_${i}`} className={i % 3 ? 'h-2.5 w-11/12' : 'h-2.5 w-4/5'} />
          </div>
        </li>
      ))}
    </>
  )
}
