import * as XLSX from 'xlsx'
import { MAX_PREVIEW_DATA_ROWS } from './constants'
import type { SpreadsheetPreview } from './types'

function uniqueHeader(base: string, used: Map<string, number>): string {
  const n = (used.get(base) ?? 0) + 1
  used.set(base, n)
  return n === 1 ? base : `${base}_${n}`
}

/**
 * Reads first sheet of .xlsx / .xls / .csv and returns header row + a few data rows for the hub preview grid.
 */
export async function parseSpreadsheetPreview(file: File): Promise<SpreadsheetPreview> {
  const name = file.name.toLowerCase()
  const isCsv = name.endsWith('.csv')

  const buf = isCsv ? undefined : await file.arrayBuffer()
  const text = isCsv ? await file.text() : undefined

  let wb: XLSX.WorkBook
  try {
    if (isCsv && text !== undefined) {
      wb = XLSX.read(text, { type: 'string' })
    } else if (buf) {
      wb = XLSX.read(buf, { type: 'array' })
    } else {
      throw new Error('Empty file')
    }
  } catch {
    throw new Error('Could not read file. Use .xlsx, .xls, or .csv.')
  }

  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error('Workbook has no sheets.')

  const sheet = wb.Sheets[sheetName]
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][]

  if (!aoa.length) {
    return {
      sheetName,
      rowCount: 0,
      columnCount: 0,
      headers: [],
      previewRows: [],
    }
  }

  const rawHeader = (aoa[0] ?? []).map((c) => String(c ?? '').trim())
  const used = new Map<string, number>()
  const headers = rawHeader.map((h, i) => {
    const base = h.length > 0 ? h : `Column_${i + 1}`
    return uniqueHeader(base, used)
  })

  const dataRows = aoa.slice(1).filter((row) => row.some((c) => String(c ?? '').trim().length > 0))
  const rowCount = dataRows.length
  const columnCount = Math.max(headers.length, ...dataRows.map((r) => r.length))

  const previewRows: Record<string, string>[] = []
  for (let r = 0; r < Math.min(MAX_PREVIEW_DATA_ROWS, dataRows.length); r++) {
    const row = dataRows[r] ?? []
    const obj: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = String(row[c] ?? '').trim()
    }
    previewRows.push(obj)
  }

  return {
    sheetName,
    rowCount,
    columnCount,
    headers,
    previewRows,
  }
}
