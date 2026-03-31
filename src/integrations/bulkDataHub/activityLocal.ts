import { BULK_HUB_EVENT, BULK_HUB_LS_KEY, MAX_ACTIVITY_ENTRIES } from './constants'
import type { BulkHubActivityEntry } from './types'

function read(): BulkHubActivityEntry[] {
  try {
    const raw = localStorage.getItem(BULK_HUB_LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as BulkHubActivityEntry[]
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

function emit() {
  window.dispatchEvent(new CustomEvent(BULK_HUB_EVENT))
}

export function loadBulkHubActivity(): BulkHubActivityEntry[] {
  return read()
}

export function saveBulkHubActivity(rows: BulkHubActivityEntry[]) {
  localStorage.setItem(BULK_HUB_LS_KEY, JSON.stringify(rows.slice(0, MAX_ACTIVITY_ENTRIES)))
  emit()
}

export function prependBulkHubActivity(entry: BulkHubActivityEntry) {
  saveBulkHubActivity([entry, ...read()].slice(0, MAX_ACTIVITY_ENTRIES))
}

export function replaceBulkHubActivity(rows: BulkHubActivityEntry[]) {
  saveBulkHubActivity(rows.slice(0, MAX_ACTIVITY_ENTRIES))
}
