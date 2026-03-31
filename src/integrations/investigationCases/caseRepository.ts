/**
 * Investigation cases: local cache + optional Java API (`/investigation-cases`).
 * Stack: `database/mssql/investigation_cases.sql` → `com.frms.ops.cases` → this module → `caseStore`.
 */

import type { InvestigationCaseDto } from '../../api/types'
import {
  liveAddInvestigationCaseNote,
  liveCreateInvestigationCase,
  liveListInvestigationCases,
  livePatchInvestigationCase,
} from '../../api/live/client'
import { CASE_PRIORITIES, CASE_SOURCES, CASE_STATUSES } from './constants'
import * as local from './caseLocal'
import type { CaseSource, InvestigationCase } from './types'

export { CASES_EVENT } from './constants'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

function isCaseSource(s: string): s is CaseSource {
  return (CASE_SOURCES as readonly string[]).includes(s)
}

function isCasePriority(s: string): s is InvestigationCase['priority'] {
  return (CASE_PRIORITIES as readonly string[]).includes(s)
}

function isCaseStatus(s: string): s is InvestigationCase['status'] {
  return (CASE_STATUSES as readonly string[]).includes(s)
}

/** Map API JSON (loose strings) onto UI types and guarantee `notes` is an array. */
export function normalizeInvestigationCase(d: InvestigationCaseDto): InvestigationCase {
  const rawNotes = Array.isArray(d.notes) ? d.notes : []
  const src = String(d.source ?? 'Operational')
  const pri = String(d.priority ?? 'Medium')
  const st = String(d.status ?? 'Open')
  return {
    id: String(d.id ?? ''),
    title: String(d.title ?? ''),
    source: isCaseSource(src) ? src : 'Operational',
    ref: d.ref != null && String(d.ref).length > 0 ? String(d.ref) : undefined,
    subject: d.subject != null && String(d.subject).length > 0 ? String(d.subject) : undefined,
    priority: isCasePriority(pri) ? pri : 'Medium',
    status: isCaseStatus(st) ? st : 'Open',
    assignee: String(d.assignee ?? 'Compliance-01'),
    createdAt: String(d.createdAt ?? ''),
    notes: rawNotes.map((n) => ({
      at: String(n.at ?? ''),
      by: String(n.by ?? ''),
      text: String(n.text ?? ''),
    })),
  }
}

export async function syncInvestigationCasesFromLive(): Promise<void> {
  if (!frmsLiveApiEnabled()) return
  const p = await liveListInvestigationCases()
  local.saveCases(p.items.map(normalizeInvestigationCase))
}

export function loadCases(): InvestigationCase[] {
  return local.loadCases()
}

export type CreateCaseInput = Omit<InvestigationCase, 'id' | 'createdAt' | 'notes'> & { note?: string }

export function createCase(input: CreateCaseInput): Promise<InvestigationCase> {
  if (!frmsLiveApiEnabled()) return Promise.resolve(local.createCaseLocal(input))
  const body = {
    title: input.title,
    source: input.source,
    ref: input.ref,
    subject: input.subject,
    priority: input.priority,
    status: input.status,
    assignee: input.assignee,
    note: input.note,
  }
  return liveCreateInvestigationCase(body).then((created) => {
    const row = normalizeInvestigationCase(created)
    local.saveCases([row, ...local.loadCases().filter((c) => c.id !== row.id)])
    return row
  })
}

export function addCaseNote(id: string, by: string, text: string): Promise<void> {
  if (!frmsLiveApiEnabled()) {
    local.addCaseNoteLocal(id, by, text)
    return Promise.resolve()
  }
  return liveAddInvestigationCaseNote(id, { by, text }).then((updated) => {
    local.mergeCaseIntoCache(normalizeInvestigationCase(updated))
  })
}

export function setCaseStatus(id: string, status: InvestigationCase['status']): Promise<void> {
  if (!frmsLiveApiEnabled()) {
    local.setCaseStatusLocal(id, status)
    return Promise.resolve()
  }
  return livePatchInvestigationCase(id, { status }).then((updated) => {
    local.mergeCaseIntoCache(normalizeInvestigationCase(updated))
  })
}
