import { Skeleton } from '../../ui'

/** MessagesSkeleton — shimmer message cards for the conversation area while its messages load. */
export function MessagesSkeleton() {
  return (
    <div data-cmp="inbox.reading_skeleton_messages" aria-busy="true" aria-label="Loading messages" className="flex-1 overflow-hidden p-4 flex flex-col gap-4">
        <article data-cmp="inbox.reading_skeleton_card_main" className="card max-w-3xl w-full p-4 flex flex-col gap-3">
          <div data-cmp="inbox.reading_skeleton_card_head" className="flex items-center gap-2"><Skeleton cmp="inbox.reading_skeleton_card_avatar" className="h-5 w-5 rounded-full" /><Skeleton cmp="inbox.reading_skeleton_card_from" className="h-3 w-32" /><Skeleton cmp="inbox.reading_skeleton_card_to" className="h-3 w-40" /><Skeleton cmp="inbox.reading_skeleton_card_time" className="h-3 w-24 ml-auto" /></div>
          {['w-full', 'w-11/12', 'w-full', 'w-3/4', 'w-5/6', 'w-1/2'].map((w, i) => <Skeleton key={i} cmp={`inbox.reading_skeleton_line_${i}`} className={`h-3 ${w}`} />)}
        </article>
        {[0, 1].map((i) => (
          <article key={i} data-cmp={`inbox.reading_skeleton_card_${i}`} className="card max-w-3xl w-full px-4 py-2.5 flex items-center gap-2">
            <Skeleton cmp={`inbox.reading_skeleton_card_${i}_avatar`} className="h-5 w-5 rounded-full" /><Skeleton cmp={`inbox.reading_skeleton_card_${i}_from`} className="h-3 w-24" /><Skeleton cmp={`inbox.reading_skeleton_card_${i}_preview`} className="h-3 flex-1" /><Skeleton cmp={`inbox.reading_skeleton_card_${i}_time`} className="h-3 w-12" />
          </article>
        ))}
    </div>
  )
}
