import { loadBeneficiaries } from '../state/mastersStore'

export function activeBeneficiaryNameSet(): Set<string> {
  return new Set(
    loadBeneficiaries()
      .filter((b) => b.status === 'Active')
      .map((b) => (b && b.fullName ? String(b.fullName).trim().toLowerCase() : ''))
      .filter(Boolean),
  )
}

export function isActiveBeneficiary(name: string, names: Set<string>) {
  return names.has(name.trim().toLowerCase())
}
