const KEY = 'frms.amlCompliance.settings.v1'
export const AML_COMPLIANCE_SETTINGS_EVENT = 'amlComplianceSettings:changed'

export type AmlComplianceSettings = {
  /** Screening mode consumed by local + live screening logic */
  screeningMode: 'keywords' | 'mock_vendor_api'
  /** Block saves/approvals when photo ID fields are missing */
  requirePhotoId: boolean
  /** 0 = off */
  maxRemittancesPerRemitterPerDay: number
  /** Same-day BDT-equivalent total cap per remitter; 0 = off */
  maxBdtTotalPerRemitterPerDay: number
  /** Flag when one remitter pays ≥ N distinct beneficiaries on same calendar day */
  patternOneToManyMin: number
  /** Flag when one beneficiary receives from ≥ N distinct remitters same day */
  patternManyToOneMin: number
  blockApprovalOnPrimaryAmlHit: boolean
  blockApprovalOnOpacDsriHit: boolean
  blockApprovalOnBusinessTerm: boolean
  blockApprovalOnPattern: boolean
  autoScreenOnSearchImport: boolean
  /** JSON object: country code → string[] keywords, e.g. {"BD":["hundi","hawala"]} */
  countryKeywordsJson: string
}

const DEFAULTS: AmlComplianceSettings = {
  screeningMode: 'keywords',
  requirePhotoId: true,
  maxRemittancesPerRemitterPerDay: 30,
  maxBdtTotalPerRemitterPerDay: 0,
  patternOneToManyMin: 4,
  patternManyToOneMin: 4,
  blockApprovalOnPrimaryAmlHit: false,
  blockApprovalOnOpacDsriHit: false,
  blockApprovalOnBusinessTerm: true,
  blockApprovalOnPattern: true,
  autoScreenOnSearchImport: true,
  countryKeywordsJson: JSON.stringify({
    BD: ['hundi', 'hawala', 'illegal corridor', 'undocumented transfer'],
    US: ['unlicensed msb'],
  }),
}

function emit() {
  window.dispatchEvent(new CustomEvent(AML_COMPLIANCE_SETTINGS_EVENT))
}

export function loadAmlComplianceSettings(): AmlComplianceSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(DEFAULTS))
      return { ...DEFAULTS }
    }
    const p = JSON.parse(raw) as Partial<AmlComplianceSettings>
    return { ...DEFAULTS, ...p }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveAmlComplianceSettings(next: AmlComplianceSettings) {
  localStorage.setItem(KEY, JSON.stringify(next))
  emit()
}
