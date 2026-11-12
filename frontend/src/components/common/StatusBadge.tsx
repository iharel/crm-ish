import { Badge } from '../ui'
import type { LeadStatus } from '../../types'

/** StatusBadge — colored pill for a configurable lead status. */
export function StatusBadge({ status, cmp }: { status: LeadStatus | undefined | null; cmp: string }) {
  if (!status) return <Badge cmp={cmp}>No status</Badge>
  return <Badge cmp={cmp} color={status.color}>{status.name}</Badge>
}
