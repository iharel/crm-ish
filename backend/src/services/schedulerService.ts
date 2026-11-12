/** schedulerService — periodic jobs (Gmail polling fallback). */
import { CONSTANTS } from '../constants.ts'

const timers: NodeJS.Timeout[] = []

export const schedulerService = {
  every(ms: number, fn: () => Promise<void> | void, name: string) {
    const t = setInterval(() => { Promise.resolve(fn()).catch((e) => console.warn(`[scheduler:${name}]`, (e as Error).message)) }, ms)
    timers.push(t)
  },
  startDefaults(syncAll: () => Promise<void>, backfill?: () => Promise<void>) {
    this.every(CONSTANTS.GMAIL_SYNC_INTERVAL_MS, syncAll, 'gmail-sync')
    if (backfill) this.every(CONSTANTS.ATTACHMENT_BACKFILL_INTERVAL_MS, backfill, 'attachment-backfill')
    setTimeout(() => syncAll().catch(() => undefined), 5000)
  },
  stop() { timers.forEach(clearInterval) },
}
