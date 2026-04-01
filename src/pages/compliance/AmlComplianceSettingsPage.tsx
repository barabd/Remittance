import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { ApiHttpError } from '../../api/http'
import { useLiveApi } from '../../api/config'
import {
  getMlaSettingsFromLive,
  pushMlaSettingsToLive,
} from '../../integrations/mlaSettings/mlaSettingsRepository'
import {
  AML_COMPLIANCE_SETTINGS_EVENT,
  loadAmlComplianceSettings,
  saveAmlComplianceSettings,
  type AmlComplianceSettings,
} from '../../state/amlComplianceSettingsStore'

const NUM_INPUT = { inputProps: { min: 0, inputMode: 'numeric' as const } }

export function AmlComplianceSettingsPage() {
  const liveApi = useLiveApi()
  const [form, setForm] = useState<AmlComplianceSettings>(() => loadAmlComplianceSettings())
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<{ severity: 'success' | 'error'; message: string } | null>(null)

  const sync = useCallback(() => setForm(loadAmlComplianceSettings()), [])

  useEffect(() => {
    const on = () => sync()
    window.addEventListener(AML_COMPLIANCE_SETTINGS_EVENT, on as EventListener)
    if (liveApi) {
      void Promise.resolve()
        .then(() => setSyncing(true))
        .then(() => getMlaSettingsFromLive())
        .then((next) => {
          if (next) setForm(next)
        })
        .catch((e) => {
          setSaveNotice({
            severity: 'error',
            message:
              e instanceof ApiHttpError
                ? e.message
                : 'Could not sync MLA settings from live API. Using local cache.',
          })
        })
        .finally(() => setSyncing(false))
    }
    return () => window.removeEventListener(AML_COMPLIANCE_SETTINGS_EVENT, on as EventListener)
  }, [sync, liveApi])

  const reload = useCallback(async () => {
    setSaveNotice(null)
    if (!liveApi) {
      sync()
      setSaveNotice({ severity: 'success', message: 'Reloaded from browser storage.' })
      return
    }
    setSyncing(true)
    try {
      const next = await getMlaSettingsFromLive()
      if (next) {
        setForm(next)
      } else {
        sync()
      }
      setSaveNotice({ severity: 'success', message: 'Reloaded from server.' })
    } catch (e) {
      setSaveNotice({
        severity: 'error',
        message:
          e instanceof ApiHttpError
            ? e.message
            : 'Could not reload MLA settings from live API.',
      })
    } finally {
      setSyncing(false)
    }
  }, [liveApi, sync])

  const save = useCallback(async () => {
    const trimmed = form.countryKeywordsJson.trim() || '{}'
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      setJsonError('Invalid JSON — fix syntax before saving.')
      return
    }
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
      setJsonError('Country keyword list must be a JSON object, e.g. {"BD":["hundi"]}.')
      return
    }
    setJsonError(null)
    setSaveNotice(null)
    setSaving(true)
    try {
      const next: AmlComplianceSettings = { ...form, countryKeywordsJson: trimmed }
      saveAmlComplianceSettings(next)
      const loaded = loadAmlComplianceSettings()
      setForm(loaded)
      if (!liveApi) {
        setSaveNotice({ severity: 'success', message: 'Saved to browser storage.' })
        return
      }
      await pushMlaSettingsToLive(loaded)
      setSaveNotice({
        severity: 'success',
        message: 'Saved and synced to server (PATCH /compliance/mla-settings → frms_mla_settings).',
      })
    } catch (e) {
      setSaveNotice({
        severity: 'error',
        message:
          e instanceof ApiHttpError
            ? e.message
            : 'Could not sync MLA settings to the API; local save is still applied.',
      })
    } finally {
      setSaving(false)
    }
  }, [form, liveApi])

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Money laundering act — screening &amp; controls
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Configure photo ID, daily limits, structuring pattern thresholds, approval blocks, and country keyword
          lists. Screening rules are implemented in{' '}
          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
            src/lib/amlCompliance.ts
          </Box>{' '}
          — replace with certified vendor APIs for production.
        </Typography>
      </Box>

      <Alert severity="info">
        Double AML: pass 1 covers OFAC/OSFI-style keywords, local/country lists, and optional mock vendor API;
        pass 2 runs OPAC and DSRI keyword scans. Use <strong>AML screen</strong> on a row or approve (with
        blocking toggles below) to exercise flows.
      </Alert>

      {syncing && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Syncing settings from server…
          </Typography>
        </Stack>
      )}

      {saveNotice ? (
        <Alert severity={saveNotice.severity} onClose={() => setSaveNotice(null)}>
          {saveNotice.message}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Screening mode</Typography>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel id="mla-screening-mode-label">Mode</InputLabel>
          <Select
            labelId="mla-screening-mode-label"
            label="Mode"
            value={form.screeningMode}
            disabled={saving}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                screeningMode: e.target.value === 'mock_vendor_api' ? 'mock_vendor_api' : 'keywords',
              }))
            }
          >
            <MenuItem value="keywords">Local keyword rules</MenuItem>
            <MenuItem value="mock_vendor_api">Mock bank screening API</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>KYC — photo ID</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={form.requirePhotoId}
              disabled={saving}
              onChange={(e) => setForm((s) => ({ ...s, requirePhotoId: e.target.checked }))}
            />
          }
          label="Require photo ID type and reference on single entry, bulk upload, and approval"
        />
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Per-day remitter limits</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
          <TextField
            label="Max remittances / remitter / day"
            type="number"
            size="small"
            value={form.maxRemittancesPerRemitterPerDay}
            disabled={saving}
            helperText="0 = unlimited"
            {...NUM_INPUT}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                maxRemittancesPerRemitterPerDay: Math.max(0, Number(e.target.value) || 0),
              }))
            }
            sx={{ minWidth: 280 }}
          />
          <TextField
            label="Max BDT equivalent / remitter / day"
            type="number"
            size="small"
            value={form.maxBdtTotalPerRemitterPerDay}
            disabled={saving}
            helperText="0 = unlimited"
            {...NUM_INPUT}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                maxBdtTotalPerRemitterPerDay: Math.max(0, Number(e.target.value) || 0),
              }))
            }
            sx={{ minWidth: 280 }}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Structuring pattern detection</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
          <TextField
            label="One-to-many threshold (distinct beneficiaries)"
            type="number"
            size="small"
            value={form.patternOneToManyMin}
            disabled={saving}
            helperText="Flag when 1 remitter sends to ≥ N beneficiaries same day (0 = off)"
            {...NUM_INPUT}
            onChange={(e) =>
              setForm((s) => ({ ...s, patternOneToManyMin: Math.max(0, Number(e.target.value) || 0) }))
            }
            sx={{ minWidth: 300 }}
          />
          <TextField
            label="Many-to-one threshold (distinct remitters)"
            type="number"
            size="small"
            value={form.patternManyToOneMin}
            disabled={saving}
            helperText="Flag when 1 beneficiary receives from ≥ N remitters same day (0 = off)"
            {...NUM_INPUT}
            onChange={(e) =>
              setForm((s) => ({ ...s, patternManyToOneMin: Math.max(0, Number(e.target.value) || 0) }))
            }
            sx={{ minWidth: 300 }}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Approval blocking</Typography>
        <Stack spacing={0.5}>
          <FormControlLabel
            control={
              <Switch
                checked={form.blockApprovalOnBusinessTerm}
                disabled={saving}
                onChange={(e) => setForm((s) => ({ ...s, blockApprovalOnBusinessTerm: e.target.checked }))}
              />
            }
            label="Block approval when remitter/beneficiary names contain high-risk business terms (Firm, Farm, Traders, M/s., Enterprise, Store, …)"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.blockApprovalOnPattern}
                disabled={saving}
                onChange={(e) => setForm((s) => ({ ...s, blockApprovalOnPattern: e.target.checked }))}
              />
            }
            label="Block approval when one-to-many or many-to-one pattern thresholds are met"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.blockApprovalOnPrimaryAmlHit}
                disabled={saving}
                onChange={(e) => setForm((s) => ({ ...s, blockApprovalOnPrimaryAmlHit: e.target.checked }))}
              />
            }
            label="Block approval when pass-1 screening returns a hit (OFAC/OSFI/Local/Vendor)"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.blockApprovalOnOpacDsriHit}
                disabled={saving}
                onChange={(e) => setForm((s) => ({ ...s, blockApprovalOnOpacDsriHit: e.target.checked }))}
              />
            }
            label="Block approval when pass-2 OPAC or DSRI screening returns a hit"
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Import automation</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={form.autoScreenOnSearchImport}
              disabled={saving}
              onChange={(e) => setForm((s) => ({ ...s, autoScreenOnSearchImport: e.target.checked }))}
            />
          }
          label="Run double AML on each row when importing Excel into Search &amp; Tracking"
        />
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Country keyword lists (JSON)</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          Keys are ISO-style country codes matched from corridor text (e.g. BDT → BD). Values are lowercase
          substrings checked against remitter + beneficiary names.
        </Typography>
        <TextField
          multiline
          minRows={5}
          fullWidth
          value={form.countryKeywordsJson}
          disabled={saving}
          error={jsonError !== null}
          helperText={jsonError ?? 'Example: {"BD":["hundi","hawala"],"US":["unlicensed msb"]}'}
          onChange={(e) => {
            setJsonError(null)
            setForm((s) => ({ ...s, countryKeywordsJson: e.target.value }))
          }}
          InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
        />
      </Paper>

      <Divider />

      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
        <Button
          variant="contained"
          onClick={() => void save()}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
        <Button variant="outlined" onClick={() => void reload()} disabled={saving || syncing}>
          {liveApi ? 'Reload from server' : 'Reload from storage'}
        </Button>
      </Stack>
    </Stack>
  )
}
