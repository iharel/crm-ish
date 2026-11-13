import type { ReactNode } from 'react'

export interface SignNoticeProps { cmp: string; icon: ReactNode; title: string; children?: ReactNode }

/** SignNotice — a centred message card on the signer's page, used for every state that is not the document itself. */
export function SignNotice({ cmp, icon, title, children }: SignNoticeProps) {
  return (
    <div data-cmp={cmp} className="flex-1 grid place-items-center p-6">
      <div data-cmp={`${cmp}.card`} className="card w-full max-w-md p-8 flex flex-col items-center gap-3 text-center">
        <span data-cmp={`${cmp}.icon`} className="h-12 w-12 rounded-full bg-surface-3 grid place-items-center">{icon}</span>
        <h1 data-cmp={`${cmp}.title`} dir="auto" className="text-lg font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </div>
  )
}
