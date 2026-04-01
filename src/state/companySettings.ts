export type CompanySettings = {
  companyName: string
  shortName: string
  headOfficeAddress: string
  country: string
  phone: string
  email: string
  regulatorNote?: string
  reportFooterText?: string
  logoDataUrl?: string
}

const STORAGE_KEY = 'frms.companySettings.v1'

const DEFAULT_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="Uttara Bank logo">
  <g fill="#006b2d">
    <path d="M300 54L176 214l38 28 86-111 86 111 38-28z"/>
    <rect x="278" y="130" width="44" height="160" rx="8"/>
    <path d="M140 275h74v167c0 36 25 64 58 64s58-28 58-64V275h74v167c0 78-56 138-132 138S140 520 140 442z"/>
    <path fill-rule="evenodd" d="M392 298a136 136 0 1 1 0 272 136 136 0 0 1 0-272m0 66a70 70 0 1 0 0 140 70 70 0 0 0 0-140"/>
  </g>
</svg>
`.trim()

const DEFAULT_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_LOGO_SVG)}`

export function getDefaultCompanySettings(): CompanySettings {
  return {
    companyName: 'Uttara Bank PLC',
    shortName: 'UBPLC',
    headOfficeAddress: 'Dhaka, Bangladesh',
    country: 'Bangladesh',
    phone: '+880',
    email: 'info@company.com',
    regulatorNote: '',
    reportFooterText: '',
    logoDataUrl: DEFAULT_LOGO_DATA_URL,
  }
}

export function loadCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultCompanySettings()
    const parsed = JSON.parse(raw) as Partial<CompanySettings>
    const next = { ...getDefaultCompanySettings(), ...parsed }
    if (!next.logoDataUrl || next.logoDataUrl.trim() === '') {
      next.logoDataUrl = DEFAULT_LOGO_DATA_URL
    }
    return next
  } catch {
    return getDefaultCompanySettings()
  }
}

export function saveCompanySettings(next: CompanySettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('companySettings:changed'))
}

