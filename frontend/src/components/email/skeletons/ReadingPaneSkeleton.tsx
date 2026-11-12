import { Skeleton } from '../../ui'
import { MessagesSkeleton } from './MessagesSkeleton'

/** ReadingPaneSkeleton — shimmer header + message cards shown while a thread that is not cached loads. */
export function ReadingPaneSkeleton({ subject }: { /** Known from the list row; shown instead of a placeholder bar. */ subject?: string | null }) {
  return (
    <section data-cmp="inbox.reading_skeleton" aria-busy="true" aria-label="Loading conversation" className="flex-1 flex flex-col min-h-0 min-w-0">
      <header data-cmp="inbox.reading_skeleton_header" className="h-12 px-4 flex items-center gap-2 border-b border-border bg-surface/60">
        {subject ? <h2 dir="auto" data-cmp="inbox.reading_skeleton_subject" className="font-semibold truncate flex-1">{subject}</h2> : <Skeleton cmp="inbox.reading_skeleton_subject_bar" className="h-4 w-64 flex-none" />}
        {subject ? null : <span data-cmp="inbox.reading_skeleton_spacer" className="flex-1" />}
        <Skeleton cmp="inbox.reading_skeleton_btn1" className="h-7 w-24" />
        <Skeleton cmp="inbox.reading_skeleton_btn2" className="h-7 w-16" />
        <Skeleton cmp="inbox.reading_skeleton_btn3" className="h-7 w-7" />
      </header>
      <MessagesSkeleton />
      <footer data-cmp="inbox.reading_skeleton_footer" className="p-3 border-t border-border bg-surface/60 flex gap-2"><Skeleton cmp="inbox.reading_skeleton_reply" className="h-8 w-20" /><Skeleton cmp="inbox.reading_skeleton_replyall" className="h-8 w-24" /><Skeleton cmp="inbox.reading_skeleton_meeting" className="h-8 w-32" /></footer>
    </section>
  )
}
