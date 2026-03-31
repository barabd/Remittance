import { Alert, Box, Button, Divider, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useLiveApi } from '../../api/config'
import {
  liveComputeLuhnCheckDigit,
  liveListSecurityUtilityEvents,
  liveValidateLuhnReference,
} from '../../api/live/client'
import { ApiHttpError } from '../../api/http'
import { appendFeedback } from '../../state/feedbackLogStore'

/** Luhn (mod 10) — demo reference integrity; institution test keys may differ. */
function luhnIsValid(full: string): boolean {
  const d = full.replace(/\D/g, '')
  if (d.length < 2) return false
  let sum = 0
  let alt = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i], 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

function luhnCheckDigitForPayload(partial: string): number {
  const d = partial.replace(/\D/g, '')
  for (let c = 0; c <= 9; c++) {
    if (luhnIsValid(d + c)) return c
  }
  return 0
}

type Algo = 'AES-GCM'

type CompressionStreamCtor = new (format: string) => {
  readable: ReadableStream<Uint8Array>
  writable: WritableStream
}

function getCompressionStreamCtor(): CompressionStreamCtor | undefined {
  const g = globalThis as typeof globalThis & { CompressionStream?: CompressionStreamCtor }
  return typeof g.CompressionStream === 'function' ? g.CompressionStream : undefined
}

function bytesToB64(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64ToBytes(b64: string) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function SecurityUtilitiesPage() {
  const live = useLiveApi()
  const [plaintext, setPlaintext] = useState('Sensitive remittance payload sample')
  const [password, setPassword] = useState('demo-password')
  const [cipherB64, setCipherB64] = useState('')
  const [ivB64, setIvB64] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [algo] = useState<Algo>('AES-GCM')

  const supportsCompression = useMemo(() => getCompressionStreamCtor() !== undefined, [])

  const [testKeyPayload, setTestKeyPayload] = useState('7992739871')
  const [testKeyFull, setTestKeyFull] = useState('79927398713')
  const [syncWarning, setSyncWarning] = useState('')
  const [lastServerEventAt, setLastServerEventAt] = useState<string | null>(null)
  const [working, setWorking] = useState<'encrypt' | 'decrypt' | 'compress' | 'compute' | 'validate' | null>(null)

  async function logUtilityAction(message: string, meta?: string) {
    try {
      await appendFeedback('security_utilities', message, meta)
    } catch {
      // UI tool should continue even if feedback logging is unavailable.
    }
  }

  useEffect(() => {
    if (!live) return
    void liveListSecurityUtilityEvents()
      .then((res) => {
        setLastServerEventAt(res.items[0]?.createdAt ? String(res.items[0].createdAt) : null)
        setSyncWarning('')
      })
      .catch((e) => {
        setSyncWarning(e instanceof ApiHttpError ? e.message : 'Live security service unavailable; using local fallback for Luhn.')
      })
  }, [live])

  async function deriveKey() {
    const enc = new TextEncoder()
    const pass = enc.encode(password)
    const hash = await crypto.subtle.digest('SHA-256', pass)
    return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  }

  async function encryptNow() {
    setError(null)
    setWorking('encrypt')
    try {
      const key = await deriveKey()
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
      setIvB64(bytesToB64(iv))
      setCipherB64(bytesToB64(new Uint8Array(encrypted)))
      setResult('Encrypted successfully.')
      void logUtilityAction('Encryption completed', `alg=${algo}; bytes=${plaintext.length}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Encryption failed')
    } finally {
      setWorking(null)
    }
  }

  async function decryptNow() {
    setError(null)
    setWorking('decrypt')
    try {
      const key = await deriveKey()
      const iv = b64ToBytes(ivB64)
      const data = b64ToBytes(cipherB64)
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
      setResult(new TextDecoder().decode(plain))
      void logUtilityAction('Decryption completed', `alg=${algo}; cipherBytes=${data.length}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decryption failed')
    } finally {
      setWorking(null)
    }
  }

  async function compressNow() {
    setError(null)
    setWorking('compress')
    try {
      if (supportsCompression) {
        const CS = getCompressionStreamCtor()
        if (!CS) throw new Error('CompressionStream missing')
        const cs = new CS('gzip')
        const writer = cs.writable.getWriter()
        writer.write(new TextEncoder().encode(plaintext))
        writer.close()
        const compressed = await new Response(cs.readable).arrayBuffer()
        setResult(`Compressed bytes (gzip): ${compressed.byteLength}`)
        void logUtilityAction('Compression test completed', `format=gzip; bytes=${compressed.byteLength}`)
      } else {
        setResult(
          `CompressionStream not available in this browser. Demo fallback size: ${new TextEncoder().encode(plaintext).length}`,
        )
        void logUtilityAction('Compression test fallback', 'CompressionStream unavailable in browser')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compression failed')
    } finally {
      setWorking(null)
    }
  }

  async function computeCheckDigitNow() {
    const base = testKeyPayload.replace(/\D/g, '')
    if (!base) {
      setError('Payload is required for check digit generation.')
      setResult('')
      return
    }

    setWorking('compute')
    setError(null)
    setResult('')
    try {
      if (live) {
        try {
          const out = await liveComputeLuhnCheckDigit(base)
          setTestKeyFull(out.fullReference)
          const ev = await liveListSecurityUtilityEvents()
          setLastServerEventAt(typeof ev.items[0]?.createdAt === 'string' ? ev.items[0].createdAt : null)
          setSyncWarning('')
        } catch (e) {
          setSyncWarning(e instanceof ApiHttpError ? e.message : 'Live check-digit failed; using local fallback.')
          const checkDigit = luhnCheckDigitForPayload(base)
          setTestKeyFull(base + String(checkDigit))
        }
      } else {
        const checkDigit = luhnCheckDigitForPayload(base)
        setTestKeyFull(base + String(checkDigit))
      }
      setResult('Check digit generated.')
      void logUtilityAction('Luhn check digit generated', `payloadLen=${base.length}`)
    } finally {
      setWorking(null)
    }
  }

  async function validateFullReferenceNow() {
    const digits = testKeyFull.replace(/\D/g, '')
    if (digits.length < 2) {
      setError('Full reference must contain at least 2 digits.')
      setResult('')
      return
    }

    setWorking('validate')
    setError(null)
    setResult('')
    try {
      let valid = luhnIsValid(digits)
      if (live) {
        try {
          const out = await liveValidateLuhnReference(digits)
          valid = out.valid
          const ev = await liveListSecurityUtilityEvents()
          setLastServerEventAt(typeof ev.items[0]?.createdAt === 'string' ? ev.items[0].createdAt : null)
          setSyncWarning('')
        } catch (e) {
          setSyncWarning(e instanceof ApiHttpError ? e.message : 'Live validation failed; using local fallback.')
        }
      }
      setResult(valid ? 'Luhn: valid.' : 'Luhn: invalid.')
      void logUtilityAction('Luhn validation run', valid ? 'valid' : 'invalid')
    } finally {
      setWorking(null)
    }
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Security utilities (demo)
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Encryption / compression demo and a reference check-digit helper (Luhn). Production test keys and MACs belong in your
          Java core.
        </Typography>
        {live ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Last server audit event:{' '}
            {lastServerEventAt
              ? new Date(lastServerEventAt).toLocaleString()
              : 'No events yet in this session'}
          </Typography>
        ) : null}
      </Box>

      {syncWarning ? (
        <Alert severity="warning" onClose={() => setSyncWarning('')}>
          {syncWarning}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <TextField select label="Algorithm" value={algo} fullWidth>
            <MenuItem value="AES-GCM">AES-GCM</MenuItem>
          </TextField>
          <TextField label="Password (demo)" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
          <TextField
            label="Plain text"
            multiline
            minRows={3}
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
            fullWidth
          />
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button variant="contained" onClick={() => void encryptNow()} disabled={working !== null}>
              Encrypt
            </Button>
            <Button variant="outlined" onClick={() => void decryptNow()} disabled={working !== null || !cipherB64 || !ivB64}>
              Decrypt
            </Button>
            <Button variant="outlined" onClick={() => void compressNow()} disabled={working !== null || !plaintext.trim()}>
              Compress test
            </Button>
          </Stack>
          <TextField label="IV (base64)" value={ivB64} onChange={(e) => setIvB64(e.target.value)} fullWidth />
          <TextField
            label="Ciphertext (base64)"
            multiline
            minRows={3}
            value={cipherB64}
            onChange={(e) => setCipherB64(e.target.value)}
            fullWidth
          />
          {error ? (
            <Alert severity="error">
              {error}
            </Alert>
          ) : null}
          {result ? <Alert severity="info">{result}</Alert> : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Test key (demo — Luhn check digit)</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          A.1.3-style authentication of a numeric reference: append a check digit, or validate a full number. Institution-specific
          test keys must be implemented per your specification.
        </Typography>
        <Stack spacing={1.5}>
          <TextField
            label="Payload (digits only, without check digit)"
            value={testKeyPayload}
            onChange={(e) => setTestKeyPayload(e.target.value)}
            fullWidth
          />
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button
              variant="contained"
              disabled={working !== null}
              onClick={() => void computeCheckDigitNow()}
            >
              {working === 'compute' ? 'Computing...' : 'Compute check digit'}
            </Button>
          </Stack>
          <Divider />
          <TextField
            label="Full reference (with check digit)"
            value={testKeyFull}
            onChange={(e) => setTestKeyFull(e.target.value)}
            fullWidth
          />
          <Button
            variant="outlined"
            disabled={working !== null}
            onClick={() => void validateFullReferenceNow()}
          >
            {working === 'validate' ? 'Validating...' : 'Validate full reference'}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}

