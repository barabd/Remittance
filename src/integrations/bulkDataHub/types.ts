export type BulkHubTarget =
  | 'exchange_bulk'
  | 'remittance_search'
  | 'file_mapping'
  | 'admin_bulk'
  | 'unknown'

export type BulkHubActivityEntry = {
  id: string
  target: BulkHubTarget
  fileName: string
  rowCount: number
  columnCount: number
  sheetName?: string
  recordedAt: string
}

export type SpreadsheetPreview = {
  sheetName: string
  rowCount: number
  columnCount: number
  headers: string[]
  /** First N rows after header, each row aligned to headers (padded). */
  previewRows: Record<string, string>[]
}
