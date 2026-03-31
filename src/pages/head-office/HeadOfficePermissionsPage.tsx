import {
  Alert,
  Box,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import Button from '@mui/material/Button'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  HEAD_OFFICE_POLICY_EVENT,
  type BranchBlockPermission,
  type HoUserRole,
  type RoleTxnPolicy,
} from '../../state/headOfficeStore'
import {
  getRolePolicies,
  saveRolePolicies,
  getEhBlocks,
  setEhBlock,
  getBranchPerms,
  upsertBranchPerm
} from '../../integrations/headOffice/headOfficeRepository'
import { loadAgents, type AgentRecord } from '../../state/mastersStore'

const roles: HoUserRole[] = ['Maker', 'Checker', 'HO Admin', 'Finance', 'Auditor']

const seedBranches: BranchBlockPermission[] = [
  { branchCode: '101', branchName: 'Branch-01', canInitiateExchangeHouseBlock: true },
  { branchCode: '301', branchName: 'Sub-Branch-03', canInitiateExchangeHouseBlock: true },
  { branchCode: '000', branchName: 'Head Office', canInitiateExchangeHouseBlock: true },
]

const seedExchangeHouses = [
  { id: 'eh-001', code: 'EH001', name: 'Gulf Exchange' },
  { id: 'eh-002', code: 'EH002', name: 'Asia Remit' },
  { id: 'eh-003', code: 'EH003', name: 'Global Send' },
]

function mergeBranchPerms(stored: BranchBlockPermission[]): BranchBlockPermission[] {
  const map = new Map(stored.map((b) => [b.branchCode, b]))
  for (const s of seedBranches) {
    if (!map.has(s.branchCode)) map.set(s.branchCode, s)
  }
  return Array.from(map.values()).sort((a, b) => a.branchCode.localeCompare(b.branchCode))
}

export function HeadOfficePermissionsPage() {
  const [policies, setPolicies] = useState<RoleTxnPolicy[]>([])
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [ehBlockList, setEhBlockMap] = useState<Record<string, boolean>>({})
  const [branchPerms, setBranchPerms] = useState<BranchBlockPermission[]>([])
  const [actionNotice, setActionNotice] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [savingPolicies, setSavingPolicies] = useState(false)

  const refresh = useCallback(async () => {
    setPolicies(await getRolePolicies())
    setAgents(loadAgents())
    setEhBlockMap(await getEhBlocks())
    setBranchPerms(mergeBranchPerms(await getBranchPerms()))
  }, [])

  useEffect(() => {
    refresh()
    const on = () => refresh()
    window.addEventListener(HEAD_OFFICE_POLICY_EVENT, on as EventListener)
    return () => window.removeEventListener(HEAD_OFFICE_POLICY_EVENT, on as EventListener)
  }, [refresh])

  const exchangeHouses = useMemo(() => {
    const fromAgents = agents
      .filter((a) => a.type === 'Exchange House')
      .map((a) => ({ id: a.id, code: a.code, name: a.name }))

    const mapped = new Map(fromAgents.map((a) => [a.code, a]))
    for (const code of Object.keys(ehBlockList)) {
      if (!mapped.has(code)) {
        mapped.set(code, { id: `eh-${code}`, code, name: `Exchange House ${code}` })
      }
    }

    if (mapped.size === 0) {
      for (const eh of seedExchangeHouses) mapped.set(eh.code, eh)
    }

    return Array.from(mapped.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [agents, ehBlockList])

  function updateDraft(role: HoUserRole, field: keyof RoleTxnPolicy, raw: string) {
    const num = Number(raw.replace(/,/g, ''))
    if (!Number.isFinite(num) || num < 0) return
    setPolicies((prev) => prev.map((p) => (p.role === role ? { ...p, [field]: num } : p)))
  }

  async function saveDraftPolicies() {
    setSavingPolicies(true)
    setError('')
    setActionNotice('')
    try {
      await saveRolePolicies(policies)
      setActionNotice('Role policies saved.')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save policies')
    } finally {
      setSavingPolicies(false)
    }
  }

  async function toggleEhBlock(code: string, blocked: boolean) {
    setError('')
    setActionNotice('')
    setEhBlockMap((prev) => ({ ...prev, [code]: blocked }))
    try {
      await setEhBlock(code, blocked)
      setActionNotice(`Exchange house ${code} block status updated.`)
      setEhBlockMap(await getEhBlocks())
    } catch (e) {
      setEhBlockMap((prev) => ({ ...prev, [code]: !blocked }))
      setError(e instanceof Error ? e.message : 'Failed to update block status')
    }
  }

  async function toggleBranchPerm(code: string, allowed: boolean) {
    setError('')
    setActionNotice('')
    const row = branchPerms.find((b) => b.branchCode === code)
    if (!row) return
    try {
      const next = { ...row, canInitiateExchangeHouseBlock: allowed }
      await upsertBranchPerm(next)
      setActionNotice(`Branch ${code} permission updated.`)
      setBranchPerms(mergeBranchPerms(await getBranchPerms()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update branch permission')
    }
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Permissions, limits &amp; exchange-house blocks
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          A.1.4 #7–#8: role limits with checker thresholds, branch rights to initiate blocks, and head-office block on
          exchange-house payouts (demo persistence in localStorage).
        </Typography>
      </Box>

      {error ? (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {actionNotice ? (
        <Alert severity="success" onClose={() => setActionNotice('')}>
          {actionNotice}
        </Alert>
      ) : null}

      <Alert severity="info">
        Maker transactions above the checker threshold should follow your checker workflow (see Approvals Queue). Wire these
        fields to Oracle roles and Java authorization services for production.
      </Alert>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Role-based limits (BDT, demo)</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Maker max txn (BDT)</TableCell>
              <TableCell>Checker required from (BDT)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => {
              const p = policies.find((x) => x.role === role) ?? {
                role,
                makerMaxTxnBdt: 0,
                checkerRequiredAboveBdt: 0,
              }
              return (
                <TableRow key={role}>
                  <TableCell>{role}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={p.makerMaxTxnBdt}
                      onChange={(e) => updateDraft(role, 'makerMaxTxnBdt', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={p.checkerRequiredAboveBdt}
                      onChange={(e) => updateDraft(role, 'checkerRequiredAboveBdt', e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Button sx={{ mt: 1.5 }} size="small" variant="contained" disabled={savingPolicies} onClick={saveDraftPolicies}>
          Save role policies
        </Button>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Branch / sub-branch — initiate EH remittance block (#7)</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Branch</TableCell>
              <TableCell align="right">Can initiate block</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {branchPerms.map((b) => (
              <TableRow key={b.branchCode}>
                <TableCell>
                  {b.branchName}{' '}
                  <Typography component="span" variant="caption" color="text.secondary">
                    ({b.branchCode})
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Switch
                    checked={b.canInitiateExchangeHouseBlock}
                    onChange={(_, v) => toggleBranchPerm(b.branchCode, v)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Exchange house — block payouts / account-pay file (#7)</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">Block payouts</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {exchangeHouses.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.code}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell align="right">
                  <Switch checked={Boolean(ehBlockList[a.code])} onChange={(_, v) => toggleEhBlock(a.code, v)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  )
}
