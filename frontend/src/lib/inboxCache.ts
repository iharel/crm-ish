/** inboxCache — the bounded caches behind fast thread switching (see docs/specs/2026-10-20_inbox-fast-switching_design.md). */
import { createResourceCache } from './resourceCache'
import type { Company, Draft, Lead, LeadStatus, Message, Thread } from '../types'

/** A cached entry older than this is shown at once and revalidated in the background. */
export const INBOX_MAX_AGE_MS = 30_000
/** Pointer must rest on a row this long before it is prefetched (skips rows the cursor merely crosses). */
export const HOVER_PREFETCH_DELAY_MS = 120

export const threadCache = createResourceCache<{ thread: Thread; messages: Message[] }>(60)
export const draftsCache = createResourceCache<Draft[]>(60)
export const taskCountCache = createResourceCache<{ open: number }>(60)
export const leadCache = createResourceCache<Lead>(40)
export const companyCache = createResourceCache<Company>(40)
/** Thread list pages by `filter|query`; a handful so tab switches are instant too. */
export const threadListCache = createResourceCache<Thread[]>(12)
/** HTML of older (collapsed) messages, loaded on expand — the thread payload carries only the newest one's HTML. */
export const messageHtmlCache = createResourceCache<{ id: string; bodyHtml: string }>(30)
/** Expanded-message HTML is cached server-side too, so revalidating it is cheap. */
export const MESSAGE_HTML_MAX_AGE_MS = 10 * 60_000
export const statusesCache = createResourceCache<LeadStatus[]>(1)
