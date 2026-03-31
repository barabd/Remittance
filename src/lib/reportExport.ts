import * as XLSX from 'xlsx'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function rowKeys(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return []
  return Object.keys(rows[0])
}

/** Tab-separated text (.txt) */
export function rowsToTsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const keys = rowKeys(rows)
  const esc = (v: unknown) => {
    const s = String(v ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
    return s
  }
  return [keys.join('\t'), ...rows.map((r) => keys.map((k) => esc(r[k])).join('\t'))].join('\n')
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportRowsToExcel(rows: Record<string, unknown>[], sheetName: string, filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || 'Report')
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export function exportRowsToCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return
  const keys = rowKeys(rows)
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [keys.join(','), ...rows.map((row) => keys.map((k) => esc(row[k])).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(filename.endsWith('.csv') ? filename : `${filename}.csv`, blob)
}

export function exportRowsToTxt(rows: Record<string, unknown>[], filename: string) {
  const blob = new Blob([rowsToTsv(rows)], { type: 'text/plain;charset=utf-8;' })
  downloadBlob(filename.endsWith('.txt') ? filename : `${filename}.txt`, blob)
}

/** Opens in Microsoft Word / LibreOffice as editable document */
export function exportRowsToWordHtml(title: string, rows: Record<string, unknown>[], filename: string) {
  const keys = rowKeys(rows)
  const th = keys.map((k) => `<th>${escapeHtml(k)}</th>`).join('')
  const body = rows
    .map((r) => {
      const tds = keys.map((k) => `<td>${escapeHtml(String(r[k] ?? ''))}</td>`).join('')
      return `<tr>${tds}</tr>`
    })
    .join('')
  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h2>${escapeHtml(title)}</h2><table border="1" cellspacing="0" cellpadding="4"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></body></html>`
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  downloadBlob(filename.endsWith('.doc') ? filename : `${filename}.doc`, blob)
}

/** User prints and chooses “Save as PDF” in the system dialog */
export function openPrintableReportWindow(title: string, rows: Record<string, unknown>[]) {
  const keys = rowKeys(rows)
  const th = keys.map((k) => `<th style="text-align:left;border:1px solid #ccc;padding:6px">${escapeHtml(k)}</th>`).join('')
  const body = rows
    .map((r) => {
      const tds = keys.map(
        (k) => `<td style="border:1px solid #ccc;padding:6px;font-size:12px">${escapeHtml(String(r[k] ?? ''))}</td>`,
      ).join('')
      return `<tr>${tds}</tr>`
    })
    .join('')
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(
    `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,sans-serif;padding:16px}table{border-collapse:collapse;width:100%}h2{font-size:18px}.hint{font-size:11px;color:#666;margin-top:12px}</style></head><body><h2>${escapeHtml(title)}</h2><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table><p class="hint">Use your browser Print dialog → Destination: Save as PDF</p></body></html>`,
  )
  w.document.close()
  w.focus()
  requestAnimationFrame(() => {
    try {
      w.print()
    } catch {
      /* ignore */
    }
  })
}

export function downloadJsonPretty(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' })
  downloadBlob(filename.endsWith('.json') ? filename : `${filename}.json`, blob)
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8;') {
  downloadBlob(filename, new Blob([content], { type: mime }))
}

export function safeExportFilename(base: string) {
  return base.replace(/[/\\?%*:|"<>]/g, '_').replaceAll(' ', '_').slice(0, 180)
}
