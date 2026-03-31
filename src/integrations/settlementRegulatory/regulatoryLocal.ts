import { REGULATORY_PACKAGE_EVENT, REGULATORY_PACKAGES_LS_KEY } from './constants'
import type { RegulatoryPackage } from './types'

function load(): RegulatoryPackage[] {
  try {
    const raw = localStorage.getItem(REGULATORY_PACKAGES_LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as RegulatoryPackage[]
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

function save(rows: RegulatoryPackage[]) {
  localStorage.setItem(REGULATORY_PACKAGES_LS_KEY, JSON.stringify(rows.slice(0, 200)))
  window.dispatchEvent(new CustomEvent(REGULATORY_PACKAGE_EVENT))
}

export function loadRegulatoryPackages(): RegulatoryPackage[] {
  return load()
}

export function saveRegulatoryPackages(rows: RegulatoryPackage[]) {
  save(rows)
}
