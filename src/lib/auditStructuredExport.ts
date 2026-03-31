/**
 * Structured audit payloads for JSON files and syslog-style lines (demo).
 * Production: emit from ASP.NET Core (Serilog JSON, syslog sink, etc.).
 */

import { redactLogText, redactUserIdentifier } from './logRedaction'
import { categoryLabel } from '../state/userActivityAuditStore'
import type { UserActivityAuditEntry } from '../state/userActivityAuditStore'

export type StructuredAuditEvent = {
  schema: 'frms.user_activity_audit.v1'
  id: string
  timestampUtc: string
  category: string
  categoryCode: UserActivityAuditEntry['category']
  eventType: string
  outcome: UserActivityAuditEntry['outcome']
  subjectUserId: string
  actorUserId: string | null
  resourceType: string | null
  resourceRef: string | null
  ip: string
  how: string | null
  clientDevice: string | null
  chainHash: string | null
  details: string
}

function mapRow(r: UserActivityAuditEntry, redact: boolean): StructuredAuditEvent {
  const details = redact ? redactLogText(r.details) : r.details
  const userId = redact ? redactUserIdentifier(r.userId) : r.userId
  const actor = r.actorUserId ? (redact ? redactUserIdentifier(r.actorUserId) : r.actorUserId) : null
  const resourceRef = r.resourceRef ? (redact ? redactLogText(r.resourceRef) : r.resourceRef) : null
  const clientDevice = r.clientDevice ? (redact ? '[REDACTED]' : r.clientDevice) : null
  return {
    schema: 'frms.user_activity_audit.v1',
    id: r.id,
    timestampUtc: r.atUtc ?? r.at,
    category: categoryLabel(r.category),
    categoryCode: r.category,
    eventType: r.eventType,
    outcome: r.outcome,
    subjectUserId: userId,
    actorUserId: actor,
    resourceType: r.resourceType ?? null,
    resourceRef,
    ip: r.ip,
    how: r.how ?? null,
    clientDevice,
    chainHash: r.entryHash ?? null,
    details,
  }
}

export function userActivityToStructuredJson(
  rows: UserActivityAuditEntry[],
  redact: boolean,
): StructuredAuditEvent[] {
  return rows.map((r) => mapRow(r, redact))
}

function syslogTimestamp(r: UserActivityAuditEntry): string {
  const s = r.atUtc ?? r.at
  if (s.includes('T')) return s.endsWith('Z') ? s : `${s}Z`
  return `${s.replace(' ', 'T')}:00.000Z`
}

/** RFC 5424–inspired single-line records; MSG is JSON for structure. */
export function userActivityToSyslogLines(rows: UserActivityAuditEntry[], redact: boolean, hostname = 'frms-spa'): string {
  return rows
    .map((r) => {
      const o = mapRow(r, redact)
      const msg = JSON.stringify(o).replace(/\n/g, ' ')
      return `<134>1 ${syslogTimestamp(r)} ${hostname} frms-audit 1 user_activity - ${msg}`
    })
    .join('\n')
}
