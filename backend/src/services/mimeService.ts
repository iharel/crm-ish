/** mimeService — build RFC 2822 messages for Gmail send + parse Gmail payloads. */
import type { gmail_v1 } from 'googleapis'

/** A MIME part carrying a file: named attachment or cid-referenced inline image. */
export interface AttachmentPart { partId: string; attachmentId: string | null; data: string | null; filename: string | null; mime: string; size: number; contentId: string | null; inline: boolean }

export interface OutgoingMail { from: string; to: string[]; cc?: string[]; bcc?: string[]; subject: string; text: string; html: string; inReplyTo?: string; references?: string; messageId: string }

function encodeHeader(s: string) { return /[^\x20-\x7e]/.test(s) ? `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=` : s }

export const mimeService = {
  build(m: OutgoingMail): string {
    const boundary = `b_${Math.random().toString(36).slice(2)}`
    const headers = [
      `From: ${m.from}`, `To: ${m.to.join(', ')}`,
      m.cc?.length ? `Cc: ${m.cc.join(', ')}` : '', m.bcc?.length ? `Bcc: ${m.bcc.join(', ')}` : '',
      `Subject: ${encodeHeader(m.subject)}`, `Message-ID: ${m.messageId}`,
      m.inReplyTo ? `In-Reply-To: ${m.inReplyTo}` : '', m.references ? `References: ${m.references}` : '',
      'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].filter(Boolean)
    const body = [
      `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', Buffer.from(m.text, 'utf8').toString('base64'),
      `--${boundary}`, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', Buffer.from(m.html, 'utf8').toString('base64'),
      `--${boundary}--`,
    ]
    return headers.join('\r\n') + '\r\n\r\n' + body.join('\r\n')
  },
  toRaw(mime: string) { return Buffer.from(mime).toString('base64url') },

  header(msg: gmail_v1.Schema$Message, name: string): string | undefined {
    return msg.payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined
  },
  bodies(msg: gmail_v1.Schema$Message): { text: string; html: string } {
    let text = ''; let html = ''
    const walk = (p?: gmail_v1.Schema$MessagePart) => {
      if (!p) return
      const data = p.body?.data
      if (data) {
        const decoded = Buffer.from(data, 'base64url').toString('utf8')
        if (p.mimeType === 'text/plain' && !text) text = decoded
        else if (p.mimeType === 'text/html' && !html) html = decoded
      }
      p.parts?.forEach(walk)
    }
    walk(msg.payload)
    return { text, html }
  },
  /**
   * Attachment parts of a Gmail payload: every leaf with a filename or a Content-ID (except the text/html alternatives).
   * `inline` is true when the part is Content-Disposition: inline or its cid is referenced from the HTML body.
   */
  attachments(msg: gmail_v1.Schema$Message, html: string): AttachmentPart[] {
    const out: AttachmentPart[] = []
    const cidsInHtml = new Set([...html.matchAll(/cid:([^"'\s>)]+)/gi)].map((m) => m[1].toLowerCase()))
    const walk = (p?: gmail_v1.Schema$MessagePart) => {
      if (!p) return
      const h = (n: string) => p.headers?.find((x) => x.name?.toLowerCase() === n)?.value ?? ''
      const mime = (p.mimeType ?? 'application/octet-stream').toLowerCase()
      const filename = p.filename || null
      const contentId = h('content-id').replace(/^<|>$/g, '').trim() || null
      const disposition = h('content-disposition').toLowerCase()
      const isBodyText = (mime === 'text/plain' || mime === 'text/html') && !filename && !disposition.startsWith('attachment')
      if (!mime.startsWith('multipart/') && !isBodyText && (filename || contentId || p.body?.attachmentId)) {
        const inline = disposition.startsWith('inline') || (!!contentId && cidsInHtml.has(contentId.toLowerCase()))
        out.push({ partId: p.partId ?? String(out.length), attachmentId: p.body?.attachmentId ?? null, data: p.body?.data ?? null, filename, mime, size: p.body?.size ?? 0, contentId, inline })
      }
      p.parts?.forEach(walk)
    }
    walk(msg.payload)
    return out
  },
  isBounce(msg: gmail_v1.Schema$Message): boolean {
    const from = (this.header(msg, 'From') ?? '').toLowerCase()
    const subject = (this.header(msg, 'Subject') ?? '').toLowerCase()
    return from.includes('mailer-daemon') || from.includes('postmaster') || subject.includes('delivery status notification') || subject.includes('undeliverable')
  },
}
