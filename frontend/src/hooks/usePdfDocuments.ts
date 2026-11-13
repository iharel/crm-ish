import { useEffect, useState } from 'react'
import { errorMessage } from '../api/apiError'
import { pdfService, type PdfDoc, type PdfPageSize } from '../services/pdfService'

export interface LoadedPdf { id: string; doc: PdfDoc; sizes: PdfPageSize[] }

/**
 * usePdfDocuments — open a list of PDFs (by id, through `load`) with pdf.js and keep them by id.
 * Documents already opened are kept across re-renders; only new ids are fetched.
 */
export function usePdfDocuments(ids: string[], load: (id: string) => Promise<ArrayBuffer>) {
  const [docs, setDocs] = useState<Record<string, LoadedPdf>>({})
  const [error, setError] = useState<string | null>(null)
  const key = ids.join(',')
  useEffect(() => {
    let alive = true
    for (const id of ids) {
      if (docs[id]) continue
      void load(id).then((bytes) => pdfService.open(bytes)).then(async (doc) => {
        const sizes = await pdfService.pageSizes(doc)
        if (alive) setDocs((d) => ({ ...d, [id]: { id, doc, sizes } }))
      }).catch((e) => { if (alive) setError(errorMessage(e)) })
    }
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { docs, error, ready: ids.every((id) => !!docs[id]) }
}
