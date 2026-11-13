/**
 * pdfService — the only module touching pdf.js, canvases for PDF pages and file downloads of PDF bytes.
 * Used by the signing field editor and the signer's page.
 */
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type PdfDoc = PDFDocumentProxy
export interface PdfPageSize { width: number; height: number }

export const pdfService = {
  /** Open a PDF from its bytes. The buffer is copied: pdf.js takes ownership of what it is given. */
  async open(bytes: ArrayBuffer): Promise<PdfDoc> {
    return pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise
  },
  /** Page sizes as displayed (rotation applied), in PDF points. */
  async pageSizes(doc: PdfDoc): Promise<PdfPageSize[]> {
    const out: PdfPageSize[] = []
    for (let i = 1; i <= doc.numPages; i++) { const v = (await doc.getPage(i)).getViewport({ scale: 1 }); out.push({ width: v.width, height: v.height }) }
    return out
  },
  /** Draw one page into a canvas at the given CSS width; returns a cancel function. */
  render(doc: PdfDoc, pageNumber: number, canvas: HTMLCanvasElement, cssWidth: number): () => void {
    let cancelled = false; let task: { cancel: () => void; promise: Promise<unknown> } | null = null
    void doc.getPage(pageNumber).then((page) => {
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * ratio })
      canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d'); if (!ctx) return
      task = page.render({ canvas, canvasContext: ctx, viewport })
      task.promise.catch(() => undefined)
    }).catch(() => undefined)
    return () => { cancelled = true; task?.cancel() }
  },
  /** Hand bytes to the browser as a file download. */
  download(bytes: ArrayBuffer, filename: string) {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  },
}
