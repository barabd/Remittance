/** Demo screening mode (#38): local keywords vs simulated vendor API. */

import {
  AML_COMPLIANCE_SETTINGS_EVENT,
  loadAmlComplianceSettings,
  saveAmlComplianceSettings,
} from './amlComplianceSettingsStore'

export type ScreeningDemoMode = 'keywords' | 'mock_vendor_api'

export const SCREENING_SETTINGS_EVENT = 'screeningSettings:changed'

const KEY = 'frms.screening.demoMode.v1'

export function getScreeningDemoMode(): ScreeningDemoMode {
  try {
    const s = loadAmlComplianceSettings()
    if (s.screeningMode === 'mock_vendor_api') return 'mock_vendor_api'
    const legacy = localStorage.getItem(KEY)
    if (legacy === 'mock_vendor_api') return 'mock_vendor_api'
    return 'keywords'
  } catch {
    return 'keywords'
  }
}

export function setScreeningDemoMode(mode: ScreeningDemoMode) {
  localStorage.setItem(KEY, mode)
  const s = loadAmlComplianceSettings()
  saveAmlComplianceSettings({ ...s, screeningMode: mode })
  window.dispatchEvent(new CustomEvent(SCREENING_SETTINGS_EVENT))
}

window.addEventListener(AML_COMPLIANCE_SETTINGS_EVENT, () => {
  window.dispatchEvent(new CustomEvent(SCREENING_SETTINGS_EVENT))
})
