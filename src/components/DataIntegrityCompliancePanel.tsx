import { Alert, Box, Button, Divider, Stack, Typography } from '@mui/material'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import { useCallback, useState } from 'react'
import { verifyPrivilegedAuditChain } from '../state/privilegedActionsAuditStore'
import { verifySystemSecurityEventsChain } from '../state/systemSecurityEventsStore'
import {
  verifySecurityAuditChain,
  verifySecurityUserActivityChain,
} from '../state/securityDirectoryStore'
import { verifyUserActivityAuditChain } from '../state/userActivityAuditStore'
import type { ChainVerifyResult } from '../lib/auditIntegrity'

function summarizeChain(name: string, r: ChainVerifyResult): string {
  if (r.checked === 0 && r.skippedLegacy > 0) {
    return `${name}: only legacy / seed rows (no integrity stamp). New events are stamped.`
  }
  if (r.ok) {
    return `${name}: OK — verified ${r.checked} stamped row(s); ${r.skippedLegacy} legacy skipped.`
  }
  return `${name}: FAILED at index ${r.brokenAt} (tamper or corrupt chain).`
}

export function DataIntegrityCompliancePanel() {
  const [lines, setLines] = useState<string[] | null>(null)

  const runVerify = useCallback(() => {
    const ua = verifyUserActivityAuditChain()
    const pr = verifyPrivilegedAuditChain()
    const ss = verifySystemSecurityEventsChain()
    const sa = verifySecurityAuditChain()
    const sm = verifySecurityUserActivityChain()
    setLines([
      summarizeChain('A.2.2.1 user activity audit', ua),
      summarizeChain('Privileged actions audit', pr),
      summarizeChain('System & security events', ss),
      summarizeChain('Security module — security audit trail', sa),
      summarizeChain('Security module — user activity log', sm),
    ])
  }, [])

  return (
    <Alert severity="info" icon={<VerifiedUserOutlinedIcon fontSize="inherit" />}>
      <Typography sx={{ fontWeight: 900, mb: 0.75 }}>Data integrity &amp; compliance (logging)</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <strong>UTC:</strong> New audit rows use ISO-8601 UTC (<code>…Z</code>) for <em>when</em>.{' '}
        <strong>W5H:</strong> Each stamped event carries <em>who</em> (actor/subject), <em>what</em> (event type),{' '}
        <em>when</em> (<code>atUtc</code>), <em>where</em> (IP + truncated device/UA), <em>how</em> (e.g. UI_ACTION).{' '}
        <strong>Immutability:</strong> Logs are <em>append-only</em> in code; each new row links to the previous hash (demo{' '}
        FNV-1a chain). Browser storage can still be cleared — production needs append-only DB / WORM + server-side HMAC-SHA256.
      </Typography>
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: lines ? 1 : 0 }}>
        <Button size="small" variant="outlined" onClick={runVerify}>
          Verify hash chains
        </Button>
        <Typography variant="caption" color="text.secondary">
          Demo resets (e.g. “Reset to seed”) replace storage and are expected to break prior chains.
        </Typography>
      </Stack>
      {lines ? (
        <Box sx={{ mt: 1 }}>
          <Divider sx={{ mb: 1 }} />
          {lines.map((t) => (
            <Typography key={t} variant="body2" sx={{ mb: 0.5 }}>
              {t}
            </Typography>
          ))}
        </Box>
      ) : null}
    </Alert>
  )
}
