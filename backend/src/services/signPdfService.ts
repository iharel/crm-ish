/**
 * signPdfService — PDF work for document signing: inspect an upload, stamp the filled fields onto the pages,
 * merge several files into one and append the certificate page(s). Pure functions over bytes; no DB, no HTTP.
 */
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, degrees, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'

const require = createRequire(import.meta.url)
/** A font with Latin, Greek, Cyrillic and Hebrew glyphs: the 14 standard PDF fonts cannot draw non-Latin names. */
const FONT_PATH = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
const FONT_BOLD_PATH = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')
let fontBytes: Promise<[Buffer, Buffer]> | null = null
const loadFonts = () => (fontBytes ??= Promise.all([fs.readFile(FONT_PATH), fs.readFile(FONT_BOLD_PATH)]))

const INK = rgb(0.07, 0.09, 0.15)
const MUTED = rgb(0.42, 0.45, 0.5)
const MIRROR: Record<string, string> = { '<': '>', '>': '<', '(': ')', ')': '(', '[': ']', ']': '[' }
const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/

export interface StampField { type: 'signature' | 'initials' | 'name' | 'date' | 'text' | 'checkbox'; page: number; x: number; y: number; w: number; h: number; /** Text, 'true' for a ticked box, or PNG bytes for a drawn signature. */ value: string | Buffer | null }
export interface StampDocument { bytes: Buffer; fields: StampField[] }
export interface CertificateInfo {
  title: string
  requestId: string
  sender: string
  completedAt: string
  documents: { filename: string; pages: number; sha256: string }[]
  recipients: { name: string; email: string; role: string; signedAt: string | null; ip: string | null; codeVerified: boolean }[]
  events: { at: string; text: string }[]
}

/**
 * pdf-lib draws glyphs left to right in the order given, so right-to-left text has to be handed over in visual order.
 * A value that starts right-to-left is reversed as a whole, with its left-to-right runs (Latin words, numbers) put
 * back the right way round; in a left-to-right line only the right-to-left runs are reversed in place.
 * Good enough for names and short values in Hebrew; Arabic letter joining is not handled.
 */
function visual(text: string): string {
  if (!RTL.test(text)) return text
  const firstStrong = /[A-Za-z\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.exec(text)?.[0] ?? ''
  if (RTL.test(firstStrong)) return [...text].reverse().join('').replace(/[A-Za-z0-9@._:/+#%&$-]+/g, (run) => [...run].reverse().join('')).replace(/[<>()[\]]/g, (c) => MIRROR[c] ?? c)
  const R = '\\u0590-\\u08FF\\uFB1D-\\uFDFF\\uFE70-\\uFEFF'
  return text.replace(new RegExp(`[${R}](?:[${R}\\s'".,-]*[${R}])?`, 'g'), (run) => [...run].reverse().join(''))
}
/** Drop characters the font has no glyph for (emoji, rare scripts) instead of failing the whole document. */
function drawable(font: PDFFont, text: string): string {
  const set = new Set(font.getCharacterSet())
  return [...text.replace(/\s+/g, ' ')].map((ch) => (set.has(ch.codePointAt(0)!) ? ch : '?')).join('')
}
function fit(font: PDFFont, text: string, maxWidth: number, size: number, minSize = 5): { text: string; size: number } {
  let s = size
  while (s > minSize && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.5
  let t = text
  while (t.length > 1 && font.widthOfTextAtSize(t, s) > maxWidth) t = t.slice(0, -1)
  return { text: t, size: s }
}

/**
 * Where a point of the page as displayed (dx from the left, dy from the top, in points) sits in PDF user space.
 * Displayed pages honour /Rotate and the crop box; PDF drawing does not, so both are undone here.
 */
function toPdf(page: PDFPage, dx: number, dy: number): { x: number; y: number } {
  const box = page.getCropBox()
  const r = ((page.getRotation().angle % 360) + 360) % 360
  if (r === 90) return { x: box.x + dy, y: box.y + dx }
  if (r === 180) return { x: box.x + box.width - dx, y: box.y + dy }
  if (r === 270) return { x: box.x + box.width - dy, y: box.y + box.height - dx }
  return { x: box.x + dx, y: box.y + box.height - dy }
}
function displaySize(page: PDFPage): { w: number; h: number; rotation: number } {
  const box = page.getCropBox()
  const rotation = ((page.getRotation().angle % 360) + 360) % 360
  return rotation === 90 || rotation === 270 ? { w: box.height, h: box.width, rotation } : { w: box.width, h: box.height, rotation }
}

function stamp(page: PDFPage, f: StampField, font: PDFFont, image: PDFImage | null) {
  const d = displaySize(page)
  const left = f.x * d.w; const top = f.y * d.h; const w = f.w * d.w; const h = f.h * d.h
  const rotate = degrees(d.rotation)
  if (f.type === 'checkbox') {
    if (f.value !== 'true') return
    const s = Math.min(w, h); const ox = left + (w - s) / 2; const oy = top + (h - s) / 2
    const p = (ux: number, uy: number) => toPdf(page, ox + ux * s, oy + uy * s)
    page.drawLine({ start: p(0.18, 0.55), end: p(0.42, 0.78), thickness: Math.max(1, s * 0.12), color: INK })
    page.drawLine({ start: p(0.42, 0.78), end: p(0.84, 0.22), thickness: Math.max(1, s * 0.12), color: INK })
    return
  }
  if (image) {
    // Fit inside the box, keep the ratio, anchor bottom-left.
    const scale = Math.min(w / image.width, h / image.height)
    const iw = image.width * scale; const ih = image.height * scale
    const at = toPdf(page, left + (w - iw) / 2, top + h - (h - ih) / 2)
    page.drawImage(image, { x: at.x, y: at.y, width: iw, height: ih, rotate })
    return
  }
  if (typeof f.value !== 'string' || !f.value.trim()) return
  const raw = drawable(font, f.value.trim())
  const fitted = fit(font, visual(raw), Math.max(4, w - 4), Math.max(6, Math.min(12, h * 0.62)))
  const textWidth = font.widthOfTextAtSize(fitted.text, fitted.size)
  // Right-to-left values hug the right edge of their box.
  const startX = RTL.test(raw) ? left + w - 2 - textWidth : left + 2
  const at = toPdf(page, startX, top + h / 2 + fitted.size * 0.32)
  page.drawText(fitted.text, { x: at.x, y: at.y, size: fitted.size, font, color: INK, rotate })
}

export const signPdfService = {
  /** Validate an uploaded PDF and count its pages. Throws a readable error for anything that cannot be signed. */
  async inspect(bytes: Buffer): Promise<{ pageCount: number }> {
    if (bytes.subarray(0, 1024).indexOf('%PDF-') < 0) throw new Error('This file is not a PDF')
    let doc: PDFDocument
    try { doc = await PDFDocument.load(bytes, { updateMetadata: false }) } catch (e) {
      if (/encrypt/i.test((e as Error).message)) throw new Error('Password-protected PDFs cannot be signed. Remove the protection and upload it again.')
      throw new Error('This PDF could not be read')
    }
    const pageCount = doc.getPageCount()
    if (!pageCount) throw new Error('This PDF has no pages')
    return { pageCount }
  },

  /** Stamp every document's fields, merge them in order and append the certificate. Returns the final PDF bytes. */
  async buildSigned(documents: StampDocument[], cert: CertificateInfo): Promise<Buffer> {
    const [regular, bold] = await loadFonts()
    const out = await PDFDocument.create()
    out.registerFontkit(fontkit)
    for (const d of documents) {
      const src = await PDFDocument.load(d.bytes, { updateMetadata: false })
      src.registerFontkit(fontkit)
      const font = d.fields.length ? await src.embedFont(regular, { subset: true }) : null
      const pages = src.getPages()
      for (const f of d.fields) {
        const page = pages[f.page - 1]; if (!page || !font) continue
        const image = Buffer.isBuffer(f.value) ? await src.embedPng(f.value) : null
        stamp(page, f, font, image)
      }
      const stamped = await PDFDocument.load(await src.save(), { updateMetadata: false })
      for (const p of await out.copyPages(stamped, stamped.getPageIndices())) out.addPage(p)
    }
    await this.appendCertificate(out, cert, await out.embedFont(regular, { subset: true }), await out.embedFont(bold, { subset: true }))
    out.setTitle(cert.title); out.setProducer('Looper CRM'); out.setCreator('Looper CRM — document signing')
    return Buffer.from(await out.save())
  },

  /** The evidence summary: who signed, when, from where, and the fingerprints of the original files. */
  async appendCertificate(doc: PDFDocument, cert: CertificateInfo, font: PDFFont, bold: PDFFont) {
    const W = 595.28; const H = 841.89; const M = 48
    let page = doc.addPage([W, H]); let y = H - M
    const line = (text: string, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
      const size = o.size ?? 9; const f = o.font ?? font
      if (y < M + size + 4) { page = doc.addPage([W, H]); y = H - M }
      const fitted = fit(f, visual(drawable(f, text)), W - 2 * M - (o.indent ?? 0), size, size)
      page.drawText(fitted.text, { x: M + (o.indent ?? 0), y: y - size, size, font: f, color: o.color ?? INK })
      y -= size + (o.gap ?? 5)
    }
    const rule = () => { y -= 4; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: rgb(0.82, 0.84, 0.87) }); y -= 10 }

    line('Signing certificate', { size: 18, font: bold, gap: 8 })
    line(cert.title, { size: 11, gap: 4 })
    line(`Request ${cert.requestId} · sent by ${cert.sender} · completed ${cert.completedAt}`, { color: MUTED })
    rule()
    line('Documents', { size: 11, font: bold, gap: 7 })
    for (const d of cert.documents) {
      line(`${d.filename} — ${d.pages} page${d.pages === 1 ? '' : 's'}`)
      line(`SHA-256 ${d.sha256}`, { size: 7.5, color: MUTED, indent: 10, gap: 7 })
    }
    rule()
    line('Recipients', { size: 11, font: bold, gap: 7 })
    for (const r of cert.recipients) {
      line(`${r.name} <${r.email}>`, { font: bold })
      line(r.role === 'copy' ? 'Received a copy (did not sign)' : r.signedAt ? `Signed ${r.signedAt}${r.ip ? ` · IP ${r.ip}` : ''}${r.codeVerified ? ' · email code verified' : ''}` : 'Did not sign', { color: MUTED, indent: 10, gap: 7 })
    }
    rule()
    line('Activity', { size: 11, font: bold, gap: 7 })
    for (const e of cert.events) line(`${e.at}  ${e.text}`, { size: 8, gap: 4 })
    y -= 8
    line('Times are in UTC. The fingerprints identify the original files exactly: any change to a file changes its fingerprint.', { size: 7.5, color: MUTED })
    line('Signers agreed to sign electronically and reached this document through a private link sent to their email address.', { size: 7.5, color: MUTED })
  },
}
