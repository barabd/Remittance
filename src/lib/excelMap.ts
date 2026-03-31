/** Resolve Excel header → cell value using a list of possible header labels (case/spacing insensitive). */

function normHeader(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function pickMapped(row: Record<string, unknown>, aliases: string[]): string {
  const keyByNorm = new Map<string, string>()
  for (const k of Object.keys(row)) {
    keyByNorm.set(normHeader(k), k)
  }
  for (const alias of aliases) {
    const orig = keyByNorm.get(normHeader(alias))
    if (orig !== undefined) {
      const v = row[orig]
      if (v !== '' && v != null) return String(v).trim()
    }
  }
  return ''
}
