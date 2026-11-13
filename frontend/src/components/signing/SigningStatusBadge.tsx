import { Badge } from '../ui'
import { REQUEST_STATUS } from '../../lib/signing'
import type { SignRequest } from '../../types'

export interface SigningStatusBadgeProps { cmp: string; request: Pick<SignRequest, 'status' | 'signedCount' | 'signerCount' | 'isTemplate'> }

/** SigningStatusBadge — a request's status; while out for signature it also shows how many have signed. */
export function SigningStatusBadge({ cmp, request }: SigningStatusBadgeProps) {
  if (request.isTemplate) return <Badge cmp={cmp} tone="primary">Template</Badge>
  const s = REQUEST_STATUS[request.status]
  return <Badge cmp={cmp} tone={s.tone}>{s.label}{request.status === 'sent' && request.signerCount > 0 ? ` · ${request.signedCount}/${request.signerCount}` : ''}</Badge>
}
