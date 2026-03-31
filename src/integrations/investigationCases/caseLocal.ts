/**
 * Browser-only investigation case cache (mirrors GET /investigation-cases when offline).
 * `caseRepository` writes here after each live API response; see `database/mssql/README.md` for the full stack.
 */

import { nextId, nowTs } from '../../lib/datetimeIds'
import { CASES_EVENT, CASES_LS_KEY } from './constants'
import type { InvestigationCase } from './types'

function seed(): InvestigationCase[] {
  return [
    {
      id: 'CASE-001',
      title: 'Possible sanctions keyword match',
      source: 'AML',
      ref: 'REM-2026-000186',
      subject: 'Rahim Uddin',
      priority: 'High',
      status: 'Investigating',
      assignee: 'Compliance-01',
      createdAt: '2026-03-26 09:20',
      notes: [{ at: '2026-03-26 09:25', by: 'Compliance-01', text: 'Requested additional KYC docs (demo).' }],
    },
  ]
}

function read(): InvestigationCase[] {
  try {
    const raw = localStorage.getItem(CASES_LS_KEY)
    if (!raw) {
      const s = seed()
      localStorage.setItem(CASES_LS_KEY, JSON.stringify(s))
      return s
    }
    const p = JSON.parse(raw) as InvestigationCase[]
    return Array.isArray(p) && p.length > 0 ? p : seed()
  } catch {
    return seed()
  }
}

function save(rows: InvestigationCase[]) {
  localStorage.setItem(CASES_LS_KEY, JSON.stringify(rows.slice(0, 300)))
  window.dispatchEvent(new CustomEvent(CASES_EVENT))
}

export function loadCases(): InvestigationCase[] {
  return read()
}

export function saveCases(rows: InvestigationCase[]) {
  save(rows)
}

export function createCaseLocal(
  input: Omit<InvestigationCase, 'id' | 'createdAt' | 'notes'> & { note?: string },
): InvestigationCase {
  const row: InvestigationCase = {
    id: nextId('CASE'),
    createdAt: nowTs(),
    notes: input.note ? [{ at: nowTs(), by: input.assignee, text: input.note }] : [],
    ...input,
  }
  save([row, ...read()])
  return row
}

export function addCaseNoteLocal(id: string, by: string, text: string) {
  const rows = read()
  const idx = rows.findIndex((c) => c.id === id)
  if (idx < 0) return
  rows[idx] = { ...rows[idx], notes: [{ at: nowTs(), by, text }, ...rows[idx].notes] }
  save(rows)
}

export function setCaseStatusLocal(id: string, status: InvestigationCase['status']) {
  const rows = read()
  const idx = rows.findIndex((c) => c.id === id)
  if (idx < 0) return
  rows[idx] = { ...rows[idx], status }
  save(rows)
}

export function mergeCaseIntoCache(updated: InvestigationCase) {
  const rows = read()
  const idx = rows.findIndex((c) => c.id === updated.id)
  if (idx < 0) save([updated, ...rows])
  else {
    rows[idx] = updated
    save(rows)
  }
}
