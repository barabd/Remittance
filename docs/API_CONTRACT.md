# FRMS Admin API contract (v1 draft)

Backend should implement these endpoints so the dashboard can move off browser persistence.

**How the SPA, `frms-ops-api`, and MSSQL link together** (proxy, context path, cache): **`docs/STACK_INTEGRATION.md`**. All JSON bodies use `application/json`. Auth is assumed (`Authorization: Bearer <token>`); details are your IAM choice.

**Base path:** `/api/v1` (dev: configure Vite proxy to your server).

**Conventions**

| Item | Rule |
|------|------|
| IDs | String IDs from server (`REM-…`, `BEN-…`, opaque UUID) |
| Dates | ISO-8601 UTC unless noted (`date` fields may be `YYYY-MM-DD`) |
| Lists | Prefer `GET ?page=&pageSize=&sort=` with `{ items, total, page, pageSize }` |
| Errors | `{ "code": "...", "message": "...", "details": {} }` with 4xx/5xx |

---

## Feature → capability mapping

| # | Feature | API surface (minimum) |
|---|---------|----------------------|
| 1 | Global remittance aggregation | Corridors summary, partner sync jobs, cross-tenant totals (your trust model) |
| 2 | Remittance management | CRUD pipeline, statuses, attachments, search |
| 3 | Beneficiary management | Beneficiaries CRUD + KYC refs + approval |
| 4 | Agent management | Agents / exchange houses + agreements |
| 5 | Head office management | Users, roles, branches, HO policies |
| 6 | Cover fund management | Cover accounts, balances, movements, limits |
| 7 | Remittance distribution | Payout instructions, rails (BEFTN/RTGS/MFS), status |
| 8 | Real-time transactions | SSE or WebSocket event stream + optional REST cursor |
| 9 | Maker–checker | **Server** state machine: only checker approves; same user cannot approve own work |
| 10 | AML | Screening requests, alerts, case workflow, audit exports |

---

## Resources

### Health

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | `{ "ok": true, "service": "frms-api" }` |

*(Dashboard dev stub today: `/api/health` on Vite only.)*

### Metrics

| Method | Path | Notes |
|--------|------|--------|
| GET | `/metrics/dashboard` | `{ worklistRowTotal, pendingApprovalsTotal, amlOpenHits, masterDataPending, reconExceptions }` — counts from queue, disbursements, remittance tracking, AML alerts, masters. `DashboardMetricsController`. |

---

### Beneficiaries

`server/frms-ops-api` (`BeneficiaryController`). Tables: `masters_beneficiary`, `masters_beneficiary_audit` (`database/mssql/masters_aml.sql`). UI: `/masters/beneficiaries` + `mastersRepository` / `BeneficiaryManagementPage`.

| Method | Path | Body / query |
|--------|------|---------------|
| GET | `/beneficiaries` | `?q=` — search name/phone; returns `Page` of beneficiary DTOs. |
| GET | `/beneficiaries/:id/audit` | `{ events: [{ at, actor, action, details? }] }` — persisted audit trail. |
| POST | `/beneficiaries` | Create body: `fullName`, `phone`, `idDocumentRef`, `bankName`, `bankAccountMasked`, `branch`, `notes?`, `status?`, `maker?`, `createdAt?`. Defaults: status **Pending Approval**, maker **HO-Maker**. Appends audit. |
| PATCH | `/beneficiaries/:id` | Partial update. **status**: `On Hold` (from pending), `Pending Approval` (release hold), `Rejected` (sets checker if sent). Other fields log “Beneficiary record updated” audit when status unchanged. |
| POST | `/beneficiaries/:id/approve` | `{ checkerUser? }` — from **Pending Approval** or **On Hold** → **Active**. **400** if maker=checker. Appends audit. Default checker: `frms.ops.masters.default-checker`. |
| POST | `/beneficiaries/:id/reject` | `{ checkerUser?, reason? }` — from pending/on hold → **Rejected**. Same maker≠checker rule. Appends audit. |

---

### Agents (A.1.4 #9 — exchange houses / correspondents)

`AgentController`. Tables: `masters_agent`, `masters_agent_audit` (`database/mssql/masters_aml.sql`). UI: `/masters/agents` → `AgentManagementPage`.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/agents` | `?q=` — search code/name. |
| GET | `/agents/:id/audit` | `{ events: [{ at, actor, action, details? }] }`. |
| POST | `/agents` | Create: `code`, `name`, `type`, `country`, `contactPhone`, `notes?`, … Defaults **Pending Approval**. Appends audit. |
| PATCH | `/agents/:id` | Partial update; status transitions **On Hold** / **release** / **Rejected** audited like beneficiaries. |
| POST | `/agents/:id/approve` | `{ checkerUser? }` — **Pending** or **On Hold** → **Active**; maker≠checker; `frms.ops.masters.default-checker`. |
| POST | `/agents/:id/reject` | `{ checkerUser?, reason? }` — pending/on hold → **Rejected**. |

---

### Cover funds

| Method | Path | Notes |
|--------|------|--------|
| GET | `/cover-funds` | |
| POST | `/cover-funds` | Opening / new partner line |
| PATCH | `/cover-funds/:id` | Balance adjustments → pending until checker |
| POST | `/cover-funds/:id/approve` | |

---

### Remittances (search / queue / lifecycle)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/remittances` | Filters: `q`, `status`, `from`, `to`, `maker`, `branch` |
| GET | `/remittances/:id` | Detail + history |
| POST | `/remittances` | Create (maker) |
| PATCH | `/remittances/:id` | Update draft |
| POST | `/remittances/:id/submit` | Enter approval queue |
| POST | `/remittances/:id/hold` | |

#### Approvals queue (A.1.4 #1–#2) — implemented

`server/frms-ops-api` (`RemittanceApprovalController`). Table `remittance_queue_item` (`database/mssql/remittance_approval_queue.sql`). UI: `/remittance/queue`. Merge: `src/integrations/remittanceQueue/` + `src/api/live/client.ts` + `src/state/remittanceQueueStore.ts`.

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/remittances/queue` | `{ items[] }` — `Pending Approval` and `On Hold` only, newest first. Each item: `id`, `remittanceNo`, `createdAt`, `corridor`, `amount`, `maker`, `payType` (`Cash` \| `Account pay`), `exchangeHouse`, `status` |
| POST | `/remittances/:id/approve` | Optional `{ checkerUser }` — defaults to `frms.ops.queue.default-checker` (e.g. `HO-Checker-01`). **400** if `checkerUser` equals `maker` (case-insensitive). Sets `Approved`, `checker`, `approvedAt`; row drops out of GET queue. |
| POST | `/remittances/:id/reject` | Optional `{ checkerUser, reason }`. Same maker≠checker rule. Sets `Rejected`; row drops out of GET queue. |

#### Search & Tracking — `remittance_record` + server MLA

`server/frms-ops-api` (`RemittanceTrackingController`, `MlaGateService`). DDL: `database/mssql/remittance_tracking_mla.sql` (`remittance_record`, `frms_mla_settings`, `frms_eh_entry_sequence`). UI live list + approve: `src/api/live/client.ts` → `GET /remittances/records`, `POST …/approve`; Compliance page syncs `GET|PATCH /compliance/mla-settings`.

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/remittances/records` | Query: `q`, `status`, `maker`, `from`, `to`, `page`, `pageSize`. Paginated list (camelCase DTOs incl. `exchangeHouse`, `photoIdType`, `photoIdRef`). |
| POST | `/remittances/records/:id/approve` | `{ checkerUser? }`. Runs MLA gates from `frms_mla_settings` (photo ID, daily limits, patterns, double AML blocks). **400** with message when a gate fails or maker=checker. |
| PATCH | `/remittances/records/:id` | Partial update: `status`, `photoIdType`, `photoIdRef`, `checker`, etc. If `status` becomes **Stopped**, server upserts `eh_blocked_remittance`. If status leaves **Stopped**, the matching block row is removed. |

#### Exchange House — single entry (A.1.3)

`RemittanceSingleEntryController`. Tables: `frms_eh_entry_sequence` (server IDs), `remittance_record` (optional `remitter_party_id`, `beneficiary_party_id`, `money_receipt_no`), `frms_mla_settings` (gates). UI: `/exchange-house/single-entry` → `RemittanceSingleEntryPage` + `livePeekSingleEntryIds` / `liveReserveSingleEntryIds` / `liveSubmitSingleEntry`.

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/remittances/single-entry/id-preview` | `{ nextIds: { remitterId, beneficiaryId, remittanceNo, moneyReceiptNo } }` — **does not** consume sequence (peek only). |
| POST | `/remittances/single-entry/reserve-ids` | Empty body. Advances `last_seq` and sets `held_seq` to that value; returns `{ nextIds }` — “New IDs only” without insert (prior `held_seq` is orphaned). |
| POST | `/remittances/single-entry` | `remitterName`, `beneficiaryName`, `photoIdType?`, `photoIdRef?`, `amount`, `fromCcy`, `toCcy`, `paymentMethod?` (`Any` \| `Cash` \| `Deposit Slip` \| `Credit/Debit Card`), `exchangeHouse?`, `maker?`. Runs the same MLA evaluation as approve (photo ID, business terms, limits, patterns, double AML) **before** allocating IDs. Allocation **reuses `held_seq`** when set (after reserve-ids); otherwise increments `last_seq`. On success: inserts `remittance_record` as **Pending Approval**, returns `{ record, nextIds }` (`nextIds` = peek after save). **400** when a gate fails. |

#### Block remittance reports (A.1.3)

`EhBlockedRemittanceController`, `EhBlockedRemittanceService`. DDL: `database/mssql/blocked_remittance_report.sql` (`eh_blocked_remittance`). UI: `/exchange-house/blocked-reports` → `BlockRemittanceReportsPage` + `src/integrations/blockedRemittances/blockedRemittanceRepository.ts`.

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/exchange-house/blocked-remittances` | Query: `q`, `page`, `pageSize`. Paginated list (newest `blockedAt` first). |
| PATCH | `/exchange-house/blocked-remittances/:id` | `{ note? }` — update compliance / ops note. |
| DELETE | `/exchange-house/blocked-remittances/:id` | **204** — removes the register row. If the linked `remittance_record` (by `remittanceRecordId` or `remittanceNo`) is **Stopped**, status is set to **Pending Approval**. |

#### BEFTN acknowledgment processing (A.1.3)

Implemented in `server/frms-ops-api` (`com.frms.ops.beftn`). DDL: `database/mssql/beftn_ack_processing.sql` (`beftn_ack_file`, `beftn_ack_row`). UI: `/exchange-house/beftn-ack` (`BeftnAckProcessingPage`).

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/exchange-house/beftn-acks` | List persisted ACK files, newest first (`id`, `fileName`, `uploadedAt`, `uploader`, `rowCount`, `status`, `appliedAt?`, `summaryJson?`). |
| GET | `/exchange-house/beftn-acks/profiles` | Returns available parser profiles and accepted header aliases (`{ id, template }[]`). Frontend should load this instead of hardcoding profile IDs. |
| POST | `/exchange-house/beftn-acks/parse` | `{ fileName, rawText, uploader?, profile?, strictHeader? }` — strict header-profile mapping on parse (`beftn_standard` default, `sponsor_bank_v1` optional). Missing required template headers returns **400** when `strictHeader=true` (default). Parse guardrails: max payload `2,000,000` chars and max `20,000` data rows per file. Persists rows in `beftn_ack_row` and file in `beftn_ack_file`. Returns `{ file, rows[] }`. |
| GET | `/exchange-house/beftn-acks/:fileId/rows` | Query: `q`, `status`, `unmatchedOnly`, `page`, `pageSize`. Returns parsed/applied rows with matching details. |
| POST | `/exchange-house/beftn-acks/:fileId/apply` | Applies ACK statuses to disbursement worklist. Match order: `txnRef`→`disbursement_item.payout_ref`, fallback `remittanceNo`→`disbursement_item.remittance_no`. Success-like statuses mark `Disbursed`, fail-like statuses mark `Failed`. Row-level conflicts are recorded with `parseStatus=Conflict` (e.g. ACK failure for already-disbursed item, or remittance fallback with payoutRef mismatch). Returns counts including `conflictCount`. |

---

### Disbursements / distribution

`server/frms-ops-api` (`DisbursementController`). DDL: `database/mssql/disbursement_worklist.sql` (`disbursement_item`, `disbursement_audit`). UI: `/remittance/disbursement` + `src/api/live/client.ts`.

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/disbursements` | Query: `q`, `status`, `channel`, `maker`, `originatingUnit`, `from`, `to`, `page`, `pageSize`. Items: `id`, `remittanceNo`, `createdAt`, `corridor`, `channel` (BEFTN/RTGS/NPSB/MFS/Cash), `payoutTo`, `payoutRef?`, `beneficiary`, `amountBDT`, `maker`, `checker?`, `status`, `originatingUnit` (`Branch` \| `Sub-Branch`). |
| GET | `/disbursements/:id/audit` | `{ events: [{ at, actor, action, details? }] }` — chronological audit trail. |
| POST | `/disbursements/:id/approve` | `{ checkerUser? }` — from **Pending Approval** only. **400** if maker=checker (case-insensitive). Appends audit. |
| POST | `/disbursements/:id/reject` | `{ checkerUser?, reason? }` — from **Pending Approval** only; same maker≠checker rule. |
| PATCH | `/disbursements/:id` | `status`: `On Hold` (from pending), `Pending Approval` (release hold), or `Queued` (from **Approved**). Optional `payoutRef`. Unsupported `status` → **400**. |
| POST | `/disbursements/:id/mark-disbursed` | `{ payoutRef? }` — from **Approved** or **Queued**; assigns generated ref if omitted. Appends audit. |

Default checker: `frms.ops.disbursement.default-checker` (e.g. `HO-Checker-01`).

---

### Compliance / AML

| Method | Path | Notes |
|--------|------|--------|
| POST | `/compliance/screen` | `{ remittanceNo, remitter, beneficiary }` → `{ alert }` where `alert` is an AML-shaped object (`id`, `remittanceNo`, `screenedAt`, `match`, `list`, `score`, `status`, `subjectHint?`) or **`null`** when clear. Vendor simulation branch is controlled by `frms_mla_settings.screening_mode` (`keywords` or `mock_vendor_api`). Implemented: `ComplianceScreenController` + `ComplianceScreenService`. |
| GET | `/compliance/mla-settings` | Singleton MLA / screening toggles (`frms_mla_settings`, id `default`) — camelCase JSON aligned with dashboard Compliance → MLA. Includes `screeningMode` (`keywords` \| `mock_vendor_api`). |
| PATCH | `/compliance/mla-settings` | Partial update; same fields as GET response. Used so Search & Tracking server approve + import gates stay in sync. |
| GET | `/compliance/risk-controls` | Query `q?` optional. Returns per-customer risk profiles (`customerName`, `maxPerTxnBdt`, `maxDailyTotalBdt`, `watchLevel`, `updatedAt`). |
| POST | `/compliance/risk-controls` | Create risk profile. |
| PATCH | `/compliance/risk-controls/:id` | Partial update risk profile. |
| DELETE | `/compliance/risk-controls/:id` | Remove risk profile. |
| GET | `/compliance/alerts` | Worklist |
| PATCH | `/compliance/alerts/:id` | Status, assignee |
| POST | `/compliance/alerts/:id/case` | Open case (integrate your case tool) |

Screening must be **server-side** for production; the UI demo rules are not sufficient.

---

### Investigation cases

Implemented in `server/frms-ops-api` (`InvestigationCaseController`). Frontend: `src/integrations/investigationCases/caseRepository.ts` + `src/api/live/client.ts` when `VITE_USE_LIVE_API=true`. DDL: `database/mssql/investigation_cases.sql`.

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/investigation-cases` | `{ items, total, page, pageSize }` — each item includes `notes[]` (`at`, `by`, `text`) |
| POST | `/investigation-cases` | `title`, `source`, `ref?`, `subject?`, `priority`, `status`, `assignee`, `note?` (initial note text) |
| PATCH | `/investigation-cases/:id` | Partial update (`status`, `assignee`, …) |
| POST | `/investigation-cases/:id/notes` | `{ by, text }` — prepends note; returns full case |

---

### Bulk data hub (preview audit #15)

Implemented in `server/frms-ops-api` (`BulkHubEventController`). UI: `/operations/bulk-data-hub` + `src/integrations/bulkDataHub/bulkHubRepository.ts`. DDL: `database/mssql/bulk_hub_log.sql`. Does **not** replace target-screen validation; stores metadata after client-side parse.

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/bulk-hub/events` | Newest first (`target`, `fileName`, `rowCount`, `columnCount`, `sheetName?`, `recordedAt`) |
| POST | `/bulk-hub/events` | `target`, `fileName`, `rowCount`, `columnCount`, `sheetName?`, `recordedAt?` |

---

### Settlement & regulatory (#31 / #32)

Implemented in `server/frms-ops-api` (`SettlementAnalyticsController`, `RegulatoryPackageController`). UI: `/operations/settlement-regulatory`. DDL: `database/mssql/settlement_regulatory.sql`. Frontend: `src/integrations/settlementRegulatory/` + `src/api/live/client.ts` when `VITE_USE_LIVE_API=true`.

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/settlement/week-stats` | `{ items[] }` — each: `day`, `grossInBdt`, `netSettlementBdt`, `bilateralAdjustments` (BDT, integer/long in JSON) |
| GET | `/settlement/bilateral-positions` | `{ items[] }` — `id`, `counterparty`, `corridor`, `netPositionBdt`, `asOf`, `multilateralBucket` |
| GET | `/regulatory/packages` | Newest first — `id`, `kind`, `title`, `period`, `summary`, `status`, `destination`, `createdAt` |
| POST | `/regulatory/packages` | `period`, `summary`, optional `title`, `destination` — creates `net_position_daily` in `Draft` |
| PATCH | `/regulatory/packages/:id/advance` | Empty body — advances status Draft → Queued → Sent (demo) → Ack (demo) |

---

### Reports (Finance & Ops)

Implemented in `server/frms-ops-api` (`com.frms.ops.reports.ReportRequestController`). UI: `/finance/reports` (legacy alias `/reports`). DDL: `database/mssql/report_requests.sql` (`frms_report_request`, `frms_report_request_audit`). Frontend: `src/pages/finance/ReportsPage.tsx` + `src/integrations/reports/reportRequestRepository.ts`.

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/reports` | `{ items[] }` newest first; each row: `id`, `reportName`, `generatedAt`, `periodFrom`, `periodTo`, `branchScope`, `rowCount`, `maker`, `checker?`, `status` |
| GET | `/reports/:id/audit` | `{ events[] }` with `at`, `actor`, `action`, `details?` |
| POST | `/reports` | `reportName`, `periodFrom`, `periodTo`, `branchScope`, `maker`, `rowCount`; queues in **Pending Approval** |
| POST | `/reports/:id/approve` | Optional `{ checkerUser }`; only from **Pending Approval**; maker ≠ checker |
| POST | `/reports/:id/reject` | Optional `{ checkerUser, reason }`; only from **Pending Approval**; maker ≠ checker |

---

### Administration (HO)

| Method | Path | Notes |
|--------|------|--------|
| GET/POST/PATCH | `/users`, `/users/:id` | |
| GET/POST/PATCH | `/branches`, `/branches/:id` | |
| GET/PUT | `/company-settings` | Logo URLs, legal text (or split resources) |

---

### Dashboard / metrics

| Method | Path | Notes |
|--------|------|--------|
| GET | `/metrics/dashboard` | Counts: pending approvals, AML open, worklist totals, recon (if applicable) |

Replaces ad-hoc `opsMetrics` local aggregation.

---

## Real-time (feature 8)

Choose one:

**A) Server-Sent Events**  
`GET /stream/remittances` — `text/event-stream`, events e.g. `transaction.updated`, `alert.created`.

**B) WebSocket**  
`WS /ws?token=...` — JSON messages `{ type, payload }`.

The frontend should subscribe and invalidate caches / patch TanStack Query (or equivalent) when events arrive.

---

## Operations hub (MSSQL + Java `frms-ops-api`)

Implemented in `server/frms-ops-api` (Spring Boot, context path `/api/v1`). Frontend merge layer: `src/integrations/operationsHub/` (single path for local + API); HTTP: `src/api/live/operationsHubClient.ts` when `VITE_USE_LIVE_API=true`.

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/operations/notifications` | Newest first |
| POST | `/operations/notifications` | `{ kind, title, body, remittanceNo? }` — `kind`: `return` \| `stop_payment` \| `system` |
| PATCH | `/operations/notifications/:id` | `{ read: true }` |
| POST | `/operations/notifications/mark-all-read` | Empty body, **204** |
| GET | `/operations/email-outbox` | Newest first |
| POST | `/operations/email-outbox` | `{ to, subject, bodyPreview, exchangeHouse?, reportRef? }` |
| PATCH | `/operations/email-outbox/:id` | `{ status: "queued" \| "sent_demo" }` |
| GET | `/operations/feedback-log` | Newest first |
| POST | `/operations/feedback-log` | `{ source, message, meta? }` — `source` matches dashboard `FeedbackSource` |
| POST | `/operations/delivery/email` | Outbox → SMTP worker stub: `{ id, to, subject, bodyPreview, bodyText?, exchangeHouse?, reportRef?, createdAt, status }` → `{ ok, message }` |
| POST | `/operations/delivery/push` | FCM data message: `{ id, kind, severity, title, body, remittanceNo?, createdAt, read?, fcmToken? }` — token targets one device; omit token to use server topic (`frms.ops.fcm.topic`). Returns `{ ok, message }`; **500** if FCM enabled and send fails. |

SPA wiring: `VITE_OPS_EMAIL_SEND_API_URL` / `VITE_OPS_PUSH_SEND_API_URL` as absolute URL or same-origin path (e.g. `/api/v1/operations/delivery/email`). Client: `src/lib/opsDeliveryClient.ts`.

DDL: `database/mssql/operations_hub.sql`. Dev default: Hibernate `ddl-auto=update` against `FRMS_JDBC_URL`.

---

## Gaps closed by this backend

| Gap | Resolution |
|-----|------------|
| localStorage only | All mutations persist via API + DB |
| Client-only maker–checker | Enforced in API + DB constraints |
| No real AML | Vendor or internal engine behind `POST /compliance/screen` |
| No real-time | SSE/WebSocket as above |
| No global aggregation | Reporting/ETL services + `/metrics` or OLAP endpoints |

---

## Layer map (DB ↔ Java ↔ SPA)

See **`database/mssql/README.md`** for a table of SQL scripts, JPA packages, and dashboard integration folders. Investigation cases: `investigation_cases.sql` → `com.frms.ops.cases` → `src/integrations/investigationCases/` → `src/api/investigationCasesApi.ts` / `caseStore`. Bulk hub: `bulk_hub_log.sql` → `com.frms.ops.bulk` → `src/integrations/bulkDataHub/` → `src/api/bulkHubApi.ts` / `src/state/bulkHubStore.ts`. Settlement / regulatory: `settlement_regulatory.sql` → `com.frms.ops.settlementreg` → `src/integrations/settlementRegulatory/` → `src/api/settlementRegulatoryApi.ts` / `settlementDemoStore` + `regulatoryPackageStore`. Approvals queue: `remittance_approval_queue.sql` → `com.frms.ops.remittance` → `src/integrations/remittanceQueue/` → `src/api/remittanceQueueApi.ts` / `remittanceQueueStore`.

---

## Frontend integration

- Types: `src/api/types.ts`
- HTTP helper: `src/api/http.ts`
- Live stubs (replace bodies with real responses): `src/api/live/client.ts`
- Operations hub integration (types + repository): `src/integrations/operationsHub/`
- Investigation cases: `src/integrations/investigationCases/`
- Bulk data hub: `src/integrations/bulkDataHub/` + `src/api/bulkHubApi.ts` + `src/state/bulkHubStore.ts`
- Settlement / regulatory: `src/integrations/settlementRegulatory/` + `src/api/settlementRegulatoryApi.ts` + `src/state/settlementDemoStore.ts` / `regulatoryPackageStore.ts`
- Approvals queue: `src/integrations/remittanceQueue/` + `src/api/remittanceQueueApi.ts` + `src/state/remittanceQueueStore.ts`
- Operations hub live HTTP: `src/api/live/operationsHubClient.ts`
- Ops delivery (SMTP/FCM handoff): `src/lib/opsDeliveryClient.ts` + env `VITE_OPS_*_SEND_API_URL`
- Enable when `VITE_USE_LIVE_API=true` and proxy/backend available; until then keep existing `mastersStore` / page state.
