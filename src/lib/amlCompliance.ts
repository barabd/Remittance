import type { AmlAlertRow } from '../state/amlAlertsStore'
import { getScreeningDemoMode } from '../state/screeningSettingsStore'
import {
  loadAmlComplianceSettings,
  type AmlComplianceSettings,
} from '../state/amlComplianceSettingsStore'
import { estimateBdtEquivalent, parseAmountDisplay } from '../state/incentiveStore'

export type ScreeningHit = {
  list: AmlAlertRow['list']
  score: number
  subjectHint: string
}

/** High-risk business-style terms (MLA maintenance list) — blocks when settings enabled. */
const BUSINESS_TERM_RE =
  /\b(?:firm|farm|traders?|messer'?s?|messers|m\/s\.?|enterprise|stores?)\b/i

/** Demo OFAC-style full-name fragments (normalized substring match). */
const DEMO_OFAC_NAME_FRAGMENTS = [
  'al qaeda',
  'blocked party demo',
  'ofac sanctioned demo',
]

/** Demo OSFI-style name fragments. */
const DEMO_OSFI_NAME_FRAGMENTS = ['osfi watchlist demo', 'canadian sanctions demo entity']

function normalizeBlob(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function hashStable(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function inferCountryCodesFromCorridor(corridor: string): string[] {
  const u = corridor.toUpperCase()
  const codes: string[] = []
  if (/\bBDT\b|→\s*BDT|BDT\s*→/.test(u)) codes.push('BD')
  if (/\bINR\b/.test(u)) codes.push('IN')
  if (/\bPKR\b/.test(u)) codes.push('PK')
  if (/\bUSD\b/.test(u)) codes.push('US')
  if (/\bEUR\b/.test(u)) codes.push('EU')
  if (/\bAED\b/.test(u)) codes.push('AE')
  if (/\bSAR\b/.test(u)) codes.push('SA')
  return [...new Set(codes)]
}

function parseCountryKeywords(json: string): Record<string, string[]> {
  try {
    const o = JSON.parse(json) as Record<string, unknown>
    const out: Record<string, string[]> = {}
    if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) {
        if (Array.isArray(v)) {
          out[k.toUpperCase()] = v.map((x) => String(x).toLowerCase().trim()).filter(Boolean)
        }
      }
    }
    return out
  } catch {
    return {}
  }
}

function evaluateCountryListHits(
  remitter: string,
  beneficiary: string,
  corridor: string,
  settings: AmlComplianceSettings,
): ScreeningHit | null {
  const blob = normalizeBlob(`${remitter}\n${beneficiary}`)
  const map = parseCountryKeywords(settings.countryKeywordsJson)
  for (const cc of inferCountryCodesFromCorridor(corridor)) {
    const words = map[cc] ?? map[cc.toLowerCase()]
    if (!words?.length) continue
    for (const w of words) {
      if (w && blob.includes(normalizeBlob(w))) {
        return {
          list: 'Local',
          score: 78,
          subjectHint: `Country list (${cc}) keyword: ${w}`,
        }
      }
    }
  }
  return null
}

const PRIMARY_KEYWORD_RULES: { test: (blob: string) => boolean; hit: ScreeningHit }[] = [
  {
    test: (b) => /north\s*korea|\bdprk\b|pyongyang/i.test(b),
    hit: { list: 'OFAC', score: 94, subjectHint: 'Jurisdiction / keyword (sanctions programme)' },
  },
  {
    test: (b) => /un\s*sanctions|united\s*nations\s*watchlist|unsc\s*hit/i.test(b),
    hit: { list: 'UN', score: 95, subjectHint: 'UN Sanctions keyword match' },
  },
  {
    test: (b) => /al[\s-]*qaeda|osama\s*bin/i.test(b),
    hit: { list: 'OFAC', score: 96, subjectHint: 'Sanctions keyword match' },
  },
  {
    test: (b) => /test[\s-]*sanction|blocked\s*party|watchlist\s*hit/i.test(b),
    hit: { list: 'Local', score: 79, subjectHint: 'Internal watchlist keyword' },
  },
  {
    test: (b) => /\bisis\b|\bisi[s']?s\b|\bdaesh\b/i.test(b),
    hit: { list: 'OFAC', score: 91, subjectHint: 'Sanctions keyword match' },
  },
  {
    test: (b) => /\bosfi\b|\bcanadian\s*sanctions\b|\bfintrac\b/i.test(b),
    hit: { list: 'OSFI', score: 88, subjectHint: 'OSFI / Canadian sanctions keyword (demo rule)' },
  },
]

function evaluateNameFragments(
  remitter: string,
  beneficiary: string,
  fragments: string[],
  list: AmlAlertRow['list'],
  baseScore: number,
): ScreeningHit | null {
  const blob = normalizeBlob(`${remitter}\n${beneficiary}`)
  for (const frag of fragments) {
    const n = normalizeBlob(frag)
    if (n && blob.includes(n)) {
      return {
        list,
        score: baseScore,
        subjectHint: `Full-name / entity fragment match (${list} demo list)`,
      }
    }
  }
  return null
}

function evaluateMockVendorApi(
  remitter: string,
  beneficiary: string,
  remittanceNo: string,
): ScreeningHit | null {
  const blob = `${remitter}\n${beneficiary}\n${remittanceNo}`.trim()
  const h = hashStable(blob)
  if (h % 19 === 0) {
    return {
      list: 'VendorAPI',
      score: 68 + (h % 25),
      subjectHint: 'Mock bank screening API match (replace with certified vendor)',
    }
  }
  return null
}

const OPAC_RULES: { test: (blob: string) => boolean; hit: ScreeningHit }[] = [
  {
    test: (b) => /\bopac\b|dual[\s-]*use|export[\s-]*control|proliferation\s*finance/i.test(b),
    hit: { list: 'OPAC', score: 85, subjectHint: 'OPAC / export-control keyword (pass 2)' },
  },
]

const DSRI_RULES: { test: (blob: string) => boolean; hit: ScreeningHit }[] = [
  {
    test: (b) => /\bdsri\b|restricted\s*end[\s-]*user|military\s*end[\s-]*user/i.test(b),
    hit: { list: 'DSRI', score: 83, subjectHint: 'DSRI / restricted end-user keyword (pass 2)' },
  },
]

function firstPrimaryKeywordHit(blob: string): ScreeningHit | null {
  for (const r of PRIMARY_KEYWORD_RULES) {
    if (r.test(blob)) return r.hit
  }
  return null
}

function firstOpacHit(blob: string): ScreeningHit | null {
  for (const r of OPAC_RULES) {
    if (r.test(blob)) return r.hit
  }
  return null
}

function firstDsriHit(blob: string): ScreeningHit | null {
  for (const r of DSRI_RULES) {
    if (r.test(blob)) return r.hit
  }
  return null
}

/** Pass 1: sanctions + OSFI-style + local/country lists + demo name lists + optional vendor API. */
export function runPrimaryAmlScreening(
  remitter: string,
  beneficiary: string,
  remittanceNo: string,
  corridor: string,
  settings: AmlComplianceSettings = loadAmlComplianceSettings(),
): ScreeningHit | null {
  const blob = `${remitter}\n${beneficiary}`.trim()
  const kw = firstPrimaryKeywordHit(blob)
  const country = evaluateCountryListHits(remitter, beneficiary, corridor, settings)
  const ofacName = evaluateNameFragments(
    remitter,
    beneficiary,
    DEMO_OFAC_NAME_FRAGMENTS,
    'OFAC',
    92,
  )
  const osfiName = evaluateNameFragments(
    remitter,
    beneficiary,
    DEMO_OSFI_NAME_FRAGMENTS,
    'OSFI',
    90,
  )

  const chain = kw ?? country ?? ofacName ?? osfiName
  const mode = getScreeningDemoMode()
  if (mode === 'mock_vendor_api') {
    return evaluateMockVendorApi(remitter, beneficiary, remittanceNo) ?? chain
  }
  return chain
}

/** Pass 2: OPAC + DSRI scanning (second AML pass). */
export function runSecondaryOpacDsriScreening(remitter: string, beneficiary: string): ScreeningHit[] {
  const blob = `${remitter}\n${beneficiary}`.trim()
  const out: ScreeningHit[] = []
  const op = firstOpacHit(blob)
  if (op) out.push(op)
  const ds = firstDsriHit(blob)
  if (ds) out.push(ds)
  return out
}

export function runDoubleAmlScreening(
  remitter: string,
  beneficiary: string,
  remittanceNo: string,
  corridor: string,
  settings?: AmlComplianceSettings,
): ScreeningHit[] {
  const s = settings ?? loadAmlComplianceSettings()
  const primary = runPrimaryAmlScreening(remitter, beneficiary, remittanceNo, corridor, s)
  const secondary = runSecondaryOpacDsriScreening(remitter, beneficiary)
  const hits: ScreeningHit[] = []
  if (primary) hits.push(primary)
  for (const h of secondary) {
    if (!hits.some((x) => x.list === h.list && x.subjectHint === h.subjectHint)) hits.push(h)
  }
  return hits
}

export function getHighRiskBusinessBlockReason(remitter: string, beneficiary: string): string | null {
  const blob = `${remitter}\n${beneficiary}`
  if (!BUSINESS_TERM_RE.test(blob)) return null
  const m = blob.match(BUSINESS_TERM_RE)
  return `High-risk business term blocked (MLA): “${m?.[0] ?? 'matched term'}” in party name fields.`
}

export function assertPhotoIdOk(
  photoIdType: string | undefined,
  photoIdRef: string | undefined,
  settings: AmlComplianceSettings = loadAmlComplianceSettings(),
): { ok: true } | { ok: false; message: string } {
  if (!settings.requirePhotoId) return { ok: true }
  const t = (photoIdType ?? '').trim()
  const r = (photoIdRef ?? '').trim()
  if (!t || !r) {
    return {
      ok: false,
      message: 'Valid photo ID is required: provide ID type (NID, Passport, etc.) and reference number before proceeding.',
    }
  }
  const typeLower = t.toLowerCase()
  if (typeLower.includes('nid') && !/^\d{10,17}$/.test(r.replace(/\s/g, ''))) {
    return { ok: false, message: 'Invalid NID format. Bangladesh NID must be 10, 13, or 17 digits.' }
  }
  if (typeLower.includes('passport') && !/^[A-Z][0-9]{8}$/i.test(r.replace(/\s/g, ''))) {
    return { ok: false, message: 'Invalid Passport format. Must be 1 letter followed by 8 digits.' }
  }
  if (r.length < 4) {
    return { ok: false, message: 'Photo ID reference appears invalid (minimum 4 characters).' }
  }
  return { ok: true }
}

export type RemittanceLite = {
  remitter: string
  beneficiary: string
  createdAt: string
  amount: string
}

export function countRemitterSameDay(rows: RemittanceLite[], remitter: string, day: string): number {
  const rm = remitter.trim().toLowerCase()
  return rows.filter(
    (r) => r.remitter.trim().toLowerCase() === rm && r.createdAt.slice(0, 10) === day,
  ).length
}

export function sumBdtRemitterSameDay(rows: RemittanceLite[], remitter: string, day: string): number {
  const rm = remitter.trim().toLowerCase()
  return rows
    .filter((r) => r.remitter.trim().toLowerCase() === rm && r.createdAt.slice(0, 10) === day)
    .reduce((s, r) => {
      const { num, ccy } = parseAmountDisplay(r.amount)
      return s + estimateBdtEquivalent(num, ccy)
    }, 0)
}

export function evaluateRemitterDailyLimits(
  rows: RemittanceLite[],
  current: RemittanceLite,
  settings: AmlComplianceSettings = loadAmlComplianceSettings(),
): { ok: true } | { ok: false; message: string } {
  const day = current.createdAt.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: true }

  if (settings.maxRemittancesPerRemitterPerDay > 0) {
    const n = countRemitterSameDay(rows, current.remitter, day)
    if (n > settings.maxRemittancesPerRemitterPerDay) {
      return {
        ok: false,
        message: `Per-day remittance count limit exceeded for remitter (${n} > ${settings.maxRemittancesPerRemitterPerDay} on ${day}).`,
      }
    }
  }

  if (settings.maxBdtTotalPerRemitterPerDay > 0) {
    const total = sumBdtRemitterSameDay(rows, current.remitter, day)
    if (total > settings.maxBdtTotalPerRemitterPerDay) {
      return {
        ok: false,
        message: `Per-day BDT-equivalent total for remitter exceeds cap (${total.toFixed(0)} > ${settings.maxBdtTotalPerRemitterPerDay}).`,
      }
    }
  }

  return { ok: true }
}

export function analyzeStructuringPatterns(
  rows: RemittanceLite[],
  current: RemittanceLite,
  settings: AmlComplianceSettings = loadAmlComplianceSettings(),
): { patterns: string[] } {
  const day = current.createdAt.slice(0, 10)
  const patterns: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { patterns }

  const sameDay = rows.filter((r) => r.createdAt.slice(0, 10) === day)
  const rem = current.remitter.trim().toLowerCase()
  const ben = current.beneficiary.trim().toLowerCase()

  const distinctBen = new Set(
    sameDay.filter((r) => r.remitter.trim().toLowerCase() === rem).map((r) => r.beneficiary.toLowerCase()),
  )
  distinctBen.add(current.beneficiary.toLowerCase())
  if (settings.patternOneToManyMin > 0 && distinctBen.size >= settings.patternOneToManyMin) {
    patterns.push(
      `One-to-many: remitter has ${distinctBen.size} distinct beneficiaries on ${day} (threshold ${settings.patternOneToManyMin}).`,
    )
  }

  const distinctRem = new Set(
    sameDay.filter((r) => r.beneficiary.trim().toLowerCase() === ben).map((r) => r.remitter.toLowerCase()),
  )
  distinctRem.add(current.remitter.toLowerCase())
  if (settings.patternManyToOneMin > 0 && distinctRem.size >= settings.patternManyToOneMin) {
    patterns.push(
      `Many-to-one: beneficiary receives from ${distinctRem.size} distinct remitters on ${day} (threshold ${settings.patternManyToOneMin}).`,
    )
  }

  return { patterns }
}

export function isPrimaryHit(hit: ScreeningHit) {
  return hit.list !== 'OPAC' && hit.list !== 'DSRI'
}

export function partitionHits(hits: ScreeningHit[]) {
  const primary = hits.filter(isPrimaryHit)
  const secondary = hits.filter((h) => !isPrimaryHit(h))
  return { primary, secondary }
}
