import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveApi } from '../../api/config'
import {
  liveDeleteCorporateMappingProfile,
  liveGetCorporateMappingDefaults,
  liveListCorporateIncentiveTiers,
  liveListCorporateMappingProfiles,
  livePatchCorporateMappingDefaults,
  liveReplaceCorporateIncentiveTiers,
  liveUpsertCorporateMappingProfile,
} from '../../api/live/client'
import { ApiHttpError } from '../../api/http'
import {
  type BulkFieldKey,
  type FileMappingProfile,
  type SearchFieldKey,
  FILE_MAPPING_EVENT,
  deleteMappingProfile,
  getDefaultBulkProfileId,
  getDefaultSearchProfileId,
  loadMappingProfiles,
  saveMappingProfile,
  saveMappingProfiles,
  setDefaultBulkProfileId,
  setDefaultSearchProfileId,
} from '../../state/fileMappingStore'
import {
  INCENTIVE_CHANGED_EVENT,
  loadIncentiveTiers,
  saveIncentiveTiers,
  type IncentiveTier,
} from '../../state/incentiveStore'

const SEARCH_LABELS: Record<SearchFieldKey, string> = {
  remittanceNo: 'Remittance / txn reference',
  exchangeHouse: 'Exchange house / partner',
  amount: 'Amount',
  remitter: 'Remitter / sender',
  beneficiary: 'Beneficiary',
  corridor: 'Corridor / pair',
  createdAt: 'Created / value date',
  maker: 'Maker / user',
  status: 'Status',
  channel: 'Channel / rail',
  photoIdType: 'Photo ID type (MLA)',
  photoIdRef: 'Photo ID number / reference (MLA)',
}

const BULK_LABELS: Record<BulkFieldKey, string> = {
  remittanceNo: 'Remittance reference',
  remitter: 'Remitter',
  beneficiary: 'Beneficiary',
  amount: 'Amount',
  currency: 'Currency',
  payoutChannel: 'Payout channel',
  payoutTo: 'Payout destination',
  exchangeHouse: 'Exchange house',
  photoIdType: 'Photo ID type (MLA)',
  photoIdRef: 'Photo ID number / reference (MLA)',
}

function parseHeaderList(s: string): string[] {
  return s
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function cloneProfileDraft(list: FileMappingProfile[], id: string): FileMappingProfile | null {
  const p = list.find((x) => x.id === id)
  return p ? { ...p } : null
}

function asPartialStringArrayMap(value: unknown): Partial<Record<string, string[]>> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(value)) {
    if (Array.isArray(v)) {
      out[k] = v.map((x) => String(x).trim()).filter(Boolean)
    }
  }
  return out
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toFileMappingProfile(row: Record<string, unknown>): FileMappingProfile {
  return {
    id: asText(row.id),
    name: asText(row.name, 'Untitled profile'),
    searchFieldHeaders: asPartialStringArrayMap(row.searchFieldHeaders) as FileMappingProfile['searchFieldHeaders'],
    bulkFieldHeaders: asPartialStringArrayMap(row.bulkFieldHeaders) as FileMappingProfile['bulkFieldHeaders'],
    updatedAt: asText(row.updatedAt),
  }
}

function toIncentiveTier(row: Record<string, unknown>): IncentiveTier {
  return {
    id: asText(row.id),
    label: asText(row.label, 'Tier'),
    minBdtEquivalent: asNumber(row.minBdtEquivalent),
    maxBdtEquivalent: asNumber(row.maxBdtEquivalent),
    pctOfPrincipal: asNumber(row.pctOfPrincipal),
    flatBdt: asNumber(row.flatBdt),
    updatedAt: asText(row.updatedAt),
  }
}

export function CorporateFileMappingPage() {
  const live = useLiveApi()
  const [pageTab, setPageTab] = useState<'mapping' | 'incentive'>('mapping')
  const [profiles, setProfiles] = useState(loadMappingProfiles)
  const [selectedId, setSelectedId] = useState<string>(() => getDefaultSearchProfileId())
  const [defaultSearchId, setDefaultSearchId] = useState<string>(() => getDefaultSearchProfileId())
  const [defaultBulkId, setDefaultBulkId] = useState<string>(() => getDefaultBulkProfileId())
  const [draft, setDraft] = useState<FileMappingProfile | null>(() =>
    cloneProfileDraft(loadMappingProfiles(), getDefaultSearchProfileId()),
  )
  const [mainTab, setMainTab] = useState(0)
  const [syncWarning, setSyncWarning] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [working, setWorking] = useState(false)

  const [tiers, setTiers] = useState<IncentiveTier[]>(loadIncentiveTiers)

  const selectedIdRef = useRef(selectedId)

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  function isRecoverableLiveFailure(error: unknown) {
    return error instanceof ApiHttpError && (error.status === 404 || error.status >= 500)
  }

  const reloadProfiles = useCallback(() => {
    const next = loadMappingProfiles()
    setProfiles(next)
    setDefaultSearchId(getDefaultSearchProfileId())
    setDefaultBulkId(getDefaultBulkProfileId())
    setDraft(cloneProfileDraft(next, selectedIdRef.current))
  }, [])

  useEffect(() => {
    const h = () => reloadProfiles()
    window.addEventListener(FILE_MAPPING_EVENT, h as EventListener)
    return () => window.removeEventListener(FILE_MAPPING_EVENT, h as EventListener)
  }, [reloadProfiles])

  useEffect(() => {
    const h = () => setTiers(loadIncentiveTiers())
    window.addEventListener(INCENTIVE_CHANGED_EVENT, h as EventListener)
    return () => window.removeEventListener(INCENTIVE_CHANGED_EVENT, h as EventListener)
  }, [])

  useEffect(() => {
    if (!live) return
    let cancelled = false
    const syncFromLive = async () => {
      try {
        const [profilesRes, defaultsRes, tiersRes] = await Promise.all([
          liveListCorporateMappingProfiles(),
          liveGetCorporateMappingDefaults(),
          liveListCorporateIncentiveTiers(),
        ])
        if (cancelled) return

        const nextProfiles: FileMappingProfile[] = profilesRes.items.map((p) => toFileMappingProfile(p))

        saveMappingProfiles(nextProfiles, false)
        setDefaultSearchProfileId(asText(defaultsRes.defaultSearchProfileId, 'default') || 'default', false)
        setDefaultBulkProfileId(asText(defaultsRes.defaultBulkProfileId, 'default') || 'default', false)
        saveIncentiveTiers(tiersRes.items.map((row) => toIncentiveTier(row)), false)
        window.dispatchEvent(new CustomEvent(FILE_MAPPING_EVENT))
        window.dispatchEvent(new CustomEvent(INCENTIVE_CHANGED_EVENT))
        setSyncWarning('')
        setLastSyncedAt(new Date().toISOString())
      } catch (e) {
        if (cancelled) return
        setSyncWarning('Live sync failed. Showing last available local settings for mapping and incentives.')
        console.error(e instanceof ApiHttpError ? e.message : 'Failed to sync corporate mapping from live API')
      }
    }

    void syncFromLive()
    return () => {
      cancelled = true
    }
  }, [live])

  const selected = profiles.find((p) => p.id === selectedId)

  function selectProfile(id: string) {
    const next = loadMappingProfiles()
    setProfiles(next)
    selectedIdRef.current = id
    setSelectedId(id)
    setDraft(cloneProfileDraft(next, id))
  }

  async function commitDraft() {
    if (!draft) return
    setWorking(true)
    setActionError('')
    try {
      if (live) {
        const saved = await liveUpsertCorporateMappingProfile({
          id: draft.id,
          name: draft.name,
          searchFieldHeaders: draft.searchFieldHeaders as Record<string, string[]>,
          bulkFieldHeaders: draft.bulkFieldHeaders as Record<string, string[]>,
        })
        const normalized = toFileMappingProfile(saved)
        saveMappingProfile({
          id: normalized.id,
          name: normalized.name,
          searchFieldHeaders: normalized.searchFieldHeaders,
          bulkFieldHeaders: normalized.bulkFieldHeaders,
        })
        setLastSyncedAt(new Date().toISOString())
      } else {
        saveMappingProfile({
          id: draft.id,
          name: draft.name,
          searchFieldHeaders: draft.searchFieldHeaders,
          bulkFieldHeaders: draft.bulkFieldHeaders,
        })
      }
      reloadProfiles()
      setActionNotice('Profile saved.')
    } catch (e) {
      if (live && isRecoverableLiveFailure(e)) {
        saveMappingProfile({
          id: draft.id,
          name: draft.name,
          searchFieldHeaders: draft.searchFieldHeaders,
          bulkFieldHeaders: draft.bulkFieldHeaders,
        })
        reloadProfiles()
        setActionNotice('Live API unavailable. Profile saved locally.')
        return
      }
      setActionError(e instanceof ApiHttpError ? e.message : 'Failed to save mapping profile')
    } finally {
      setWorking(false)
    }
  }

  async function addProfile() {
    setWorking(true)
    setActionError('')
    const name = `Corporate layout ${profiles.length + 1}`
    try {
      let createdProfile: FileMappingProfile
      if (live) {
        const created = await liveUpsertCorporateMappingProfile({
          id: '',
          name,
          searchFieldHeaders: {},
          bulkFieldHeaders: {},
        })
        createdProfile = toFileMappingProfile(created)
      } else {
        createdProfile = saveMappingProfile({
          name,
          searchFieldHeaders: {},
          bulkFieldHeaders: {},
        })
      }

      if (live) {
        saveMappingProfile({
          id: createdProfile.id,
          name: createdProfile.name,
          searchFieldHeaders: createdProfile.searchFieldHeaders,
          bulkFieldHeaders: createdProfile.bulkFieldHeaders,
        })
        setLastSyncedAt(new Date().toISOString())
      }

      const next = loadMappingProfiles()
      setProfiles(next)
      const nextId = createdProfile.id
      selectedIdRef.current = nextId
      setSelectedId(nextId)
      setDraft(cloneProfileDraft(next, nextId))
      setActionNotice('New profile created.')
    } catch (e) {
      if (live && isRecoverableLiveFailure(e)) {
        const n = saveMappingProfile({
          name,
          searchFieldHeaders: {},
          bulkFieldHeaders: {},
        })
        const next = loadMappingProfiles()
        setProfiles(next)
        selectedIdRef.current = n.id
        setSelectedId(n.id)
        setDraft(cloneProfileDraft(next, n.id))
        setActionNotice('Live API unavailable. New profile created locally.')
        return
      }
      setActionError(e instanceof ApiHttpError ? e.message : 'Failed to create profile')
    } finally {
      setWorking(false)
    }
  }

  const persistTiers = useCallback(
    async (next: IncentiveTier[]) => {
      try {
        if (live) {
          const res = await liveReplaceCorporateIncentiveTiers(next)
          saveIncentiveTiers(res.map((row) => toIncentiveTier(row)))
          setTiers(loadIncentiveTiers())
          setLastSyncedAt(new Date().toISOString())
        } else {
          saveIncentiveTiers(next)
        }
      } catch (e) {
        setSyncWarning(e instanceof ApiHttpError ? e.message : 'Failed to save incentive tiers')
      }
    },
    [live],
  )

  const deleteSelectedProfile = useCallback(async () => {
    if (!selected || selected.id === 'default') return
    setWorking(true)
    setActionError('')
    try {
      if (live) {
        await liveDeleteCorporateMappingProfile(selected.id)
        setLastSyncedAt(new Date().toISOString())
      }
      deleteMappingProfile(selected.id)
      const next = loadMappingProfiles()
      setProfiles(next)
      selectedIdRef.current = 'default'
      setSelectedId('default')
      setDraft(cloneProfileDraft(next, 'default'))
      setActionNotice('Profile deleted.')
    } catch (e) {
      if (live && isRecoverableLiveFailure(e)) {
        deleteMappingProfile(selected.id)
        const next = loadMappingProfiles()
        setProfiles(next)
        selectedIdRef.current = 'default'
        setSelectedId('default')
        setDraft(cloneProfileDraft(next, 'default'))
        setActionNotice('Live API unavailable. Profile deleted locally.')
        return
      }
      setActionError(e instanceof ApiHttpError ? e.message : 'Failed to delete profile')
    } finally {
      setWorking(false)
    }
  }, [live, selected])

  const updateDefaultProfile = useCallback(
    async (kind: 'search' | 'bulk', value: string) => {
      try {
        if (live) {
          await livePatchCorporateMappingDefaults(
            kind === 'search'
              ? { defaultSearchProfileId: value }
              : { defaultBulkProfileId: value },
          )
          setLastSyncedAt(new Date().toISOString())
        }
        if (kind === 'search') setDefaultSearchProfileId(value)
        else setDefaultBulkProfileId(value)
        reloadProfiles()
      } catch (e) {
        setSyncWarning(e instanceof ApiHttpError ? e.message : 'Failed to update default profile')
      }
    },
    [live, reloadProfiles],
  )

  const tierCols: GridColDef<IncentiveTier>[] = useMemo(
    () => [
      { field: 'label', headerName: 'Tier', flex: 1.2, minWidth: 180, editable: true },
      {
        field: 'minBdtEquivalent',
        headerName: 'Min BDT eq.',
        type: 'number',
        flex: 0.7,
        minWidth: 110,
        editable: true,
      },
      {
        field: 'maxBdtEquivalent',
        headerName: 'Max BDT eq.',
        type: 'number',
        flex: 0.7,
        minWidth: 110,
        editable: true,
      },
      {
        field: 'pctOfPrincipal',
        headerName: '% of principal',
        type: 'number',
        flex: 0.6,
        minWidth: 110,
        editable: true,
      },
      {
        field: 'flatBdt',
        headerName: 'Flat ৳',
        type: 'number',
        flex: 0.5,
        minWidth: 90,
        editable: true,
      },
    ],
    [],
  )

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Corporate file mapping & incentives
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Map customer-specific Excel column titles (#24) and tune BDT incentive tiers used on Excel uploads (#30). Replace with
          core pricing later.
        </Typography>
        {live ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Last synced:{' '}
            {lastSyncedAt
              ? new Date(lastSyncedAt).toLocaleString()
              : 'Not synced yet in this session'}
          </Typography>
        ) : null}
      </Box>

      {syncWarning ? (
        <Alert severity="warning" onClose={() => setSyncWarning('')}>
          {syncWarning}
        </Alert>
      ) : null}

      <Paper sx={{ px: 2, pt: 1 }}>
        <Tabs value={pageTab} onChange={(_, v) => setPageTab(v)} textColor="inherit">
          <Tab value="mapping" label="Column mapping" />
          <Tab value="incentive" label="Incentive tiers" />
        </Tabs>
      </Paper>

      {pageTab === 'incentive' ? (
        <Paper sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>Incentive calculation (BDT)</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Tiers apply to BDT-equivalent principal from uploaded amounts (FX from Pricing → range rates). Edit cells, then save.
          </Typography>
          <Box sx={{ height: 360 }}>
            <DataGrid
              rows={tiers}
              columns={tierCols}
              getRowId={(r) => r.id}
              processRowUpdate={(newRow) => {
                const next = tiers.map((t) => (t.id === newRow.id ? { ...newRow, id: newRow.id } : t))
                setTiers(next)
                void persistTiers(next)
                return newRow
              }}
              sx={{ border: 0 }}
            />
          </Box>
        </Paper>
      ) : (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
            <Paper sx={{ p: 2, flex: 1, minWidth: 260 }}>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Profiles</Typography>
              <Button size="small" variant="outlined" onClick={() => void addProfile()} disabled={working} sx={{ mb: 1 }}>
                New profile
              </Button>
              <Stack spacing={0.5}>
                {profiles.map((p) => (
                  <Button
                    key={p.id}
                    size="small"
                    variant={p.id === selectedId ? 'contained' : 'text'}
                    onClick={() => selectProfile(p.id)}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  >
                    {p.name}
                    {p.id === 'default' ? ' (built-in)' : ''}
                  </Button>
                ))}
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Defaults for upload dialogs
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                label="Search & Tracking Excel"
                value={defaultSearchId}
                onChange={(e) => void updateDefaultProfile('search', e.target.value)}
              >
                {profiles.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                label="Bulk upload Excel"
                value={defaultBulkId}
                onChange={(e) => void updateDefaultProfile('bulk', e.target.value)}
                sx={{ mt: 1.5 }}
              >
                {profiles.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            </Paper>

            <Paper sx={{ p: 2, flex: 2 }}>
              {!draft || !selected ? (
                <Alert severity="info">Select a profile.</Alert>
              ) : (
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
                    <TextField
                      label="Profile name"
                      value={draft.name}
                      onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                      sx={{ minWidth: 280 }}
                    />
                    <Button variant="contained" onClick={() => void commitDraft()} disabled={working}>
                      Save profile
                    </Button>
                    {selected.id !== 'default' ? (
                      <Button
                        color="error"
                        variant="outlined"
                        disabled={working}
                        onClick={() => void deleteSelectedProfile()}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </Stack>

                  <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                    Enter <Box component="span" sx={{ fontWeight: 600 }}>extra</Box> column titles your customer sends (comma-separated). Built-in aliases are always
                    tried after these.
                  </Alert>

                  <Paper sx={{ px: 2, pt: 1 }}>
                    <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)}>
                      <Tab label="Search & Tracking import" />
                      <Tab label="Exchange bulk import" />
                    </Tabs>
                  </Paper>

                  {mainTab === 0 ? (
                    <Stack spacing={1.5}>
                      {(Object.keys(SEARCH_LABELS) as SearchFieldKey[]).map((key) => (
                        <TextField
                          key={key}
                          label={SEARCH_LABELS[key]}
                          size="small"
                          value={(draft.searchFieldHeaders[key] ?? []).join(', ')}
                          onChange={(e) => {
                            const list = parseHeaderList(e.target.value)
                            setDraft((d) => {
                              if (!d) return d
                              const next = { ...d.searchFieldHeaders }
                              if (list.length) next[key] = list
                              else delete next[key]
                              return { ...d, searchFieldHeaders: next }
                            })
                          }}
                          placeholder="e.g. ACME_REF, Wire ID"
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Stack spacing={1.5}>
                      {(Object.keys(BULK_LABELS) as BulkFieldKey[]).map((key) => (
                        <TextField
                          key={key}
                          label={BULK_LABELS[key]}
                          size="small"
                          value={(draft.bulkFieldHeaders[key] ?? []).join(', ')}
                          onChange={(e) => {
                            const list = parseHeaderList(e.target.value)
                            setDraft((d) => {
                              if (!d) return d
                              const next = { ...d.bulkFieldHeaders }
                              if (list.length) next[key] = list
                              else delete next[key]
                              return { ...d, bulkFieldHeaders: next }
                            })
                          }}
                          placeholder="Corporate column title(s)"
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              )}
            </Paper>
          </Stack>
        </>
      )}

      <Snackbar
        open={Boolean(actionNotice)}
        autoHideDuration={5000}
        onClose={() => setActionNotice('')}
        message={actionNotice}
      />

      <Snackbar
        open={Boolean(actionError)}
        autoHideDuration={6000}
        onClose={() => setActionError('')}
        message={actionError}
      />
    </Stack>
  )
}
