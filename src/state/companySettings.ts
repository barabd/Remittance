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
    logoDataUrl: '',
  }
}

export function loadCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultCompanySettings()
    const parsed = JSON.parse(raw) as Partial<CompanySettings>
    return { ...getDefaultCompanySettings(), ...parsed }
  } catch {
    return getDefaultCompanySettings()
  }
}

export function saveCompanySettings(next: CompanySettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('companySettings:changed'))
}

