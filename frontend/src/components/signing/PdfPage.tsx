import { useEffect, useRef, type ReactNode } from 'react'
import { pdfService, type PdfDoc, type PdfPageSize } from '../../services/pdfService'

export interface PdfPageProps {
  cmp: string
  doc: PdfDoc
  pageNumber: number
  /** Page size in PDF points (as displayed); gives the box its ratio before the page is drawn. */
  size: PdfPageSize
  /** Width in CSS pixels. */
  width: number
  /** Overlay content (fields), positioned in percentages of the page. */
  children?: ReactNode
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  className?: string
}

/**
 * PdfPage — one PDF page drawn on a canvas with an overlay layer on top for fields. The canvas ref is required:
 * pdf.js draws straight into the element.
 */
export function PdfPage({ cmp, doc, pageNumber, size, width, children, onPointerDown, className }: PdfPageProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!canvas.current || width <= 0) return
    return pdfService.render(doc, pageNumber, canvas.current, width)
  }, [doc, pageNumber, width])
  const height = Math.round((width * size.height) / size.width)
  return (
    <div data-cmp={cmp} data-page={pageNumber} onPointerDown={onPointerDown} style={{ width, height }} className={`relative shrink-0 bg-white shadow-elevated rounded-sm overflow-hidden select-none ${className ?? ''}`}>
      <canvas data-cmp={`${cmp}.canvas`} ref={canvas} className="absolute inset-0 h-full w-full" />
      <div data-cmp={`${cmp}.overlay`} className="absolute inset-0">{children}</div>
    </div>
  )
}
