/**
 * Sync browser MLA / screening settings with Java `GET|PATCH /compliance/mla-settings` (`frms_mla_settings`).
 */

import type { MlaSettingsDto } from '../../api/types'
import { liveGetMlaSettings, livePatchMlaSettings } from '../../api/live/client'
import {
  type AmlComplianceSettings,
  saveAmlComplianceSettings,
} from '../../state/amlComplianceSettingsStore'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

function dtoToLocal(d: MlaSettingsDto): AmlComplianceSettings {
  return {
    screeningMode: d.screeningMode === 'mock_vendor_api' ? 'mock_vendor_api' : 'keywords',
    requirePhotoId: Boolean(d.requirePhotoId),
    maxRemittancesPerRemitterPerDay: Number(d.maxRemittancesPerRemitterPerDay) || 0,
    maxBdtTotalPerRemitterPerDay: Number(d.maxBdtTotalPerRemitterPerDay) || 0,
    patternOneToManyMin: Number(d.patternOneToManyMin) || 0,
    patternManyToOneMin: Number(d.patternManyToOneMin) || 0,
    blockApprovalOnBusinessTerm: Boolean(d.blockApprovalOnBusinessTerm),
    blockApprovalOnPattern: Boolean(d.blockApprovalOnPattern),
    blockApprovalOnPrimaryAmlHit: Boolean(d.blockApprovalOnPrimaryAmlHit),
    blockApprovalOnOpacDsriHit: Boolean(d.blockApprovalOnOpacDsriHit),
    autoScreenOnSearchImport: Boolean(d.autoScreenOnSearchImport),
    countryKeywordsJson:
      typeof d.countryKeywordsJson === 'string' && d.countryKeywordsJson.length > 0
        ? d.countryKeywordsJson
        : '{}',
  }
}

function localToPatch(s: AmlComplianceSettings): Partial<MlaSettingsDto> {
  return {
    screeningMode: s.screeningMode,
    requirePhotoId: s.requirePhotoId,
    maxRemittancesPerRemitterPerDay: s.maxRemittancesPerRemitterPerDay,
    maxBdtTotalPerRemitterPerDay: s.maxBdtTotalPerRemitterPerDay,
    patternOneToManyMin: s.patternOneToManyMin,
    patternManyToOneMin: s.patternManyToOneMin,
    blockApprovalOnBusinessTerm: s.blockApprovalOnBusinessTerm,
    blockApprovalOnPattern: s.blockApprovalOnPattern,
    blockApprovalOnPrimaryAmlHit: s.blockApprovalOnPrimaryAmlHit,
    blockApprovalOnOpacDsriHit: s.blockApprovalOnOpacDsriHit,
    autoScreenOnSearchImport: s.autoScreenOnSearchImport,
    countryKeywordsJson: s.countryKeywordsJson,
  }
}

export async function syncMlaSettingsFromLive(): Promise<void> {
  if (!frmsLiveApiEnabled()) return
  const d = await liveGetMlaSettings()
  saveAmlComplianceSettings(dtoToLocal(d))
}

export async function getMlaSettingsFromLive(): Promise<AmlComplianceSettings | null> {
  if (!frmsLiveApiEnabled()) return null
  const d = await liveGetMlaSettings()
  const mapped = dtoToLocal(d)
  saveAmlComplianceSettings(mapped)
  return mapped
}

export async function pushMlaSettingsToLive(settings: AmlComplianceSettings): Promise<void> {
  if (!frmsLiveApiEnabled()) return
  await livePatchMlaSettings(localToPatch(settings))
}
