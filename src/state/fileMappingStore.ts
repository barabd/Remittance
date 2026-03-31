import { nextId, nowTs } from './mastersStore'

export type SearchFieldKey =
  | 'remittanceNo'
  | 'createdAt'
  | 'corridor'
  | 'amount'
  | 'maker'
  | 'status'
  | 'channel'
  | 'remitter'
  | 'beneficiary'
  | 'exchangeHouse'
  | 'photoIdType'
  | 'photoIdRef'

export type BulkFieldKey =
  | 'remittanceNo'
  | 'remitter'
  | 'beneficiary'
  | 'amount'
  | 'currency'
  | 'payoutChannel'
  | 'payoutTo'
  | 'exchangeHouse'
  | 'photoIdType'
  | 'photoIdRef'

export type FileMappingProfile = {
  id: string
  name: string
  /** Tried before built-in defaults */
  searchFieldHeaders: Partial<Record<SearchFieldKey, string[]>>
  bulkFieldHeaders: Partial<Record<BulkFieldKey, string[]>>
  updatedAt: string
}

export const FILE_MAPPING_EVENT = 'fileMapping:changed'

const K_PROFILES = 'frms.fileMapping.profiles.v1'
const K_DEF_SEARCH = 'frms.fileMapping.defaultSearchProfile.v1'
const K_DEF_BULK = 'frms.fileMapping.defaultBulkProfile.v1'

export const DEFAULT_SEARCH_ALIASES: Record<SearchFieldKey, string[]> = {
  remittanceNo: ['remittanceNo', 'Remittance No', 'RemittanceNo', 'TxnRef', 'TXN_REF', 'Reference'],
  createdAt: ['createdAt', 'Created At', 'CreatedAt', 'Value Date', 'Transaction Date'],
  corridor: ['corridor', 'Corridor', 'Route', 'Currency Pair'],
  amount: ['amount', 'Amount', 'Send Amount', 'Principal'],
  maker: ['maker', 'Maker', 'Created By', 'Originator'],
  status: ['status', 'Status', 'State'],
  channel: ['channel', 'Channel', 'Payout Channel', 'Rail'],
  remitter: ['remitter', 'Remitter', 'Sender', 'Ordering Customer'],
  beneficiary: ['beneficiary', 'Beneficiary', 'Receiver', 'Payee Name'],
  exchangeHouse: ['exchangeHouse', 'Exchange House', 'ExchangeHouse', 'NBFI', 'Partner EH'],
  photoIdType: ['photoIdType', 'Photo ID Type', 'ID Type', 'Document Type'],
  photoIdRef: ['photoIdRef', 'Photo ID', 'ID Number', 'ID No', 'National ID', 'Passport No'],
}

export const DEFAULT_BULK_ALIASES: Record<BulkFieldKey, string[]> = {
  remittanceNo: ['remittanceNo', 'Remittance No', 'RemittanceNo', 'TxnRef', 'TXN_REF'],
  remitter: ['remitter', 'Remitter', 'Sender'],
  beneficiary: ['beneficiary', 'Beneficiary', 'Receiver', 'Payee Name'],
  amount: ['amount', 'Amount', 'Principal', 'Send Amount'],
  currency: ['currency', 'Currency', 'CCY'],
  payoutChannel: ['payoutChannel', 'Channel', 'Payout Channel', 'Rail'],
  payoutTo: ['payoutTo', 'Payout To', 'Account', 'IBAN'],
  exchangeHouse: ['exchangeHouse', 'Exchange House', 'NBFI', 'Partner'],
  photoIdType: ['photoIdType', 'Photo ID Type', 'ID Type', 'Document Type'],
  photoIdRef: ['photoIdRef', 'Photo ID', 'ID Number', 'ID No', 'National ID', 'Passport No'],
}

function emit() {
  window.dispatchEvent(new CustomEvent(FILE_MAPPING_EVENT))
}

function seedProfiles(): FileMappingProfile[] {
  return [
    {
      id: 'default',
      name: 'Standard FRMS',
      searchFieldHeaders: {},
      bulkFieldHeaders: {},
      updatedAt: nowTs(),
    },
  ]
}

function readProfiles(): FileMappingProfile[] {
  try {
    const raw = localStorage.getItem(K_PROFILES)
    if (!raw) {
      const s = seedProfiles()
      localStorage.setItem(K_PROFILES, JSON.stringify(s))
      return s
    }
    const p = JSON.parse(raw) as FileMappingProfile[]
    return Array.isArray(p) && p.length > 0 ? p : seedProfiles()
  } catch {
    return seedProfiles()
  }
}

function writeProfiles(rows: FileMappingProfile[]) {
  localStorage.setItem(K_PROFILES, JSON.stringify(rows))
  emit()
}

function writeProfilesSilent(rows: FileMappingProfile[]) {
  localStorage.setItem(K_PROFILES, JSON.stringify(rows))
}

export function loadMappingProfiles(): FileMappingProfile[] {
  return readProfiles()
}

export function getMappingProfile(id: string): FileMappingProfile | undefined {
  return readProfiles().find((p) => p.id === id)
}

export function saveMappingProfile(row: {
  id?: string
  name: string
  searchFieldHeaders: FileMappingProfile['searchFieldHeaders']
  bulkFieldHeaders: FileMappingProfile['bulkFieldHeaders']
}): FileMappingProfile {
  const list = readProfiles()
  const id = row.id ?? nextId('MAP')
  const next: FileMappingProfile = {
    id,
    name: row.name.trim() || 'Untitled profile',
    searchFieldHeaders: row.searchFieldHeaders,
    bulkFieldHeaders: row.bulkFieldHeaders,
    updatedAt: nowTs(),
  }
  const idx = list.findIndex((p) => p.id === id)
  if (idx >= 0) list[idx] = next
  else list.push(next)
  writeProfiles(list)
  return next
}

export function saveMappingProfiles(rows: FileMappingProfile[], emitEvent = true) {
  const normalized = rows.length > 0 ? rows : seedProfiles()
  if (emitEvent) writeProfiles(normalized)
  else writeProfilesSilent(normalized)
}

export function deleteMappingProfile(id: string) {
  if (id === 'default') return
  writeProfiles(readProfiles().filter((p) => p.id !== id))
  if (getDefaultSearchProfileId() === id) setDefaultSearchProfileId('default')
  if (getDefaultBulkProfileId() === id) setDefaultBulkProfileId('default')
}

export function searchHeadersFor(profile: FileMappingProfile | undefined, key: SearchFieldKey): string[] {
  const extra = profile?.searchFieldHeaders[key] ?? []
  return [...extra, ...DEFAULT_SEARCH_ALIASES[key]]
}

export function bulkHeadersFor(profile: FileMappingProfile | undefined, key: BulkFieldKey): string[] {
  const extra = profile?.bulkFieldHeaders[key] ?? []
  return [...extra, ...DEFAULT_BULK_ALIASES[key]]
}

export function getDefaultSearchProfileId(): string {
  try {
    return localStorage.getItem(K_DEF_SEARCH) || 'default'
  } catch {
    return 'default'
  }
}

export function setDefaultSearchProfileId(id: string, emitEvent = true) {
  localStorage.setItem(K_DEF_SEARCH, id)
  if (emitEvent) emit()
}

export function getDefaultBulkProfileId(): string {
  try {
    return localStorage.getItem(K_DEF_BULK) || 'default'
  } catch {
    return 'default'
  }
}

export function setDefaultBulkProfileId(id: string, emitEvent = true) {
  localStorage.setItem(K_DEF_BULK, id)
  if (emitEvent) emit()
}
