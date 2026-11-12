/** spreadsheetService — parse CSV / TSV / XLSX uploads into header-keyed rows. */
import fs from 'node:fs/promises'
import * as XLSX from 'xlsx'

export type SheetRow = Record<string, string>

function normalizeHeader(h: unknown): string { return String(h ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') }

export const spreadsheetService = {
  /** Read the first sheet of a CSV/TSV/XLSX file. Keys are normalized headers (snake_case), values are trimmed strings. */
  async rowsFromFile(filePath: string, originalName: string): Promise<{ headers: string[]; rows: SheetRow[] }> {
    const lower = originalName.toLowerCase()
    const buf = await fs.readFile(filePath)
    const wb = lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')
      ? XLSX.read(buf.toString('utf8').replace(/^﻿/, ''), { type: 'string', raw: true })
      : XLSX.read(buf, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    if (!sheet) return { headers: [], rows: [] }
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' })
    const headerIdx = matrix.findIndex((r) => r.some((c) => String(c ?? '').trim() !== ''))
    if (headerIdx < 0) return { headers: [], rows: [] }
    const headers = (matrix[headerIdx] as unknown[]).map(normalizeHeader)
    const rows: SheetRow[] = []
    for (const r of matrix.slice(headerIdx + 1)) {
      if (!r.some((c) => String(c ?? '').trim() !== '')) continue
      const row: SheetRow = {}
      headers.forEach((h, i) => { if (h) row[h] = String(r[i] ?? '').trim() })
      rows.push(row)
    }
    return { headers: headers.filter(Boolean), rows }
  },
}
