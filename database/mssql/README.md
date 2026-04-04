# MSSQL scripts (FRMS admin / `frms-ops-api`)

**Full stack wiring (browser → Vite → Spring → these tables):** see **`docs/STACK_INTEGRATION.md`** (merge checklist + layer map). REST details: **`docs/API_CONTRACT.md`**.

## SQL Server 2022 ↔ Spring Boot (JDBC)

This folder holds **DDL** for database **`frms_ops`**. The running API connects via **JDBC** only — not the React app.

| Item | Path |
|------|------|
| DDL + `sqlcmd` / PowerShell helpers | **`database/mssql/`** (this folder) |
| Spring datasource (URL, user, password) | **`server/frms-ops-api/src/main/resources/application.yml`** → `spring.datasource` |
| Copy-paste JDBC env template | **`database/mssql/jdbc.example.env`** |

Override credentials without editing YAML (recommended):

| Environment variable | Purpose |
|----------------------|---------|
| `FRMS_JDBC_URL` | Full JDBC URL (must include `databaseName=frms_ops` or your DB name) |
| `FRMS_DB_USER` | SQL login (e.g. `sa` or a contained user) |
| `FRMS_DB_PASSWORD` | Password |

**Example JDBC URLs (SQL Server 2022)**

- Default instance, local dev (same as YAML default):

  `jdbc:sqlserver://localhost:1433;databaseName=frms_ops;encrypt=false;trustServerCertificate=true`

- **Named instance** (e.g. `SQLEXPRESS` — use comma port *or* backslash instance, not both in the same style; Microsoft JDBC supports `serverName\instance`):

  `jdbc:sqlserver://localhost\\SQLEXPRESS;databaseName=frms_ops;encrypt=false;trustServerCertificate=true`

- **Encryption on** (typical for hardened installs; self-signed cert):

  `jdbc:sqlserver://localhost:1433;databaseName=frms_ops;encrypt=true;trustServerCertificate=true`

After the database exists, start **`frms-ops-api`**; with `ddl-auto: update`, Hibernate can create/update tables. For **explicit DDL**, use §1–2 below or `build_database.ps1`.

## 1. Create the database

JDBC expects a database named **`frms_ops`** (see `server/frms-ops-api/src/main/resources/application.yml`). SQL Server does not create it automatically.

1. Connect to **`master`** (SSMS, Azure Data Studio, or `sqlcmd`).
2. Run **`00_create_database.sql`** — creates `frms_ops` if it does not exist (case-insensitive Latin1 collation).

**sqlcmd (example, from this folder):**

```text
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -i 00_create_database.sql
```

### One-shot: create DB + all tables

From the repo root (or any directory), run **`build_database.ps1`**. It runs `00_create_database.sql`, then every DDL file in the order listed in §2 against **`frms_ops`**. Requires **`sqlcmd`** on PATH.

```text
powershell -ExecutionPolicy Bypass -File database/mssql/build_database.ps1 -Password "YourStrong!Passw0rd"
```

Windows authentication:

```text
powershell -ExecutionPolicy Bypass -File database/mssql/build_database.ps1 -Server ".\SQLEXPRESS" -TrustedConnection
```

## 2. Create tables (optional explicit DDL)

Apply these **in `frms_ops`** for explicit DDL, or rely on **Hibernate `ddl-auto: update`** in dev (`server/frms-ops-api`) to create/update tables without running scripts.

Suggested order (no cross-file FKs except within `investigation_cases.sql`):

1. `operations_hub.sql`
2. `masters_aml.sql`
3. `risk_controls.sql`
4. `investigation_cases.sql`
5. `bulk_hub_log.sql`
6. `settlement_regulatory.sql`
7. `remittance_approval_queue.sql`
8. `disbursement_worklist.sql`
9. `beftn_ack_processing.sql`
10. `remittance_tracking_mla.sql`
11. `blocked_remittance_report.sql`
12. `report_requests.sql`
13. `finance.sql`
14. `incentive_distribution.sql`
15. `pricing.sql`
16. `corporate_file_mapping.sql`
17. `security_utilities.sql`
18. `security_vapt.sql`

**sqlcmd (run each `-d frms_ops`):**

```text
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -d frms_ops -i operations_hub.sql
```

Repeat for each script, or run them in SSMS with database **frms_ops** selected.

## 3. Production patch for screening mode

If your environment already has `frms_mla_settings` and you only want the new screening mode persistence (`screening_mode`), run:

```text
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -d frms_ops -i patch_aml_screening_mode.sql
```

This patch is idempotent and safe to rerun.

**How this ties to the React app:** see **`docs/STACK_INTEGRATION.md`** (browser → `/api/v1` proxy → Spring `context-path` → JDBC → these tables; live mode uses `VITE_USE_LIVE_API=true` and `src/api/live/client.ts`).

| Script | Tables | Spring (JPA) | Dashboard integration |
|--------|--------|--------------|------------------------|
| `00_create_database.sql` | Database `frms_ops` | — | Required before JDBC can connect (unless DB already exists). Run on `master`. |
| `operations_hub.sql` | Ops notifications, email outbox, feedback | `com.frms.ops.notification`, `outbox`, `feedback` | `src/integrations/operationsHub/` → `operationsHubClient.ts` |
| `masters_aml.sql` | Beneficiaries + audit, agents + `masters_agent_audit` (A.1.4 #9), cover funds, AML alerts | `com.frms.ops.masters.*`, `com.frms.ops.compliance` | `src/integrations/masters/`, `src/integrations/aml/` → `client.ts` |
| `risk_controls.sql` | `risk_control_profile` | `com.frms.ops.compliance.risk` | Compliance risk controls page (`/compliance/risk-controls`) + remittance/disbursement approval risk gate |
| `investigation_cases.sql` | `investigation_case`, `investigation_case_note` | `com.frms.ops.cases` | `src/integrations/investigationCases/caseRepository.ts` → `client.ts` |
| `bulk_hub_log.sql` | `bulk_hub_event` | `com.frms.ops.bulk` | `bulkHubRepository.ts` → `client.ts`; facade `src/state/bulkHubStore.ts`; boundary `src/api/bulkHubApi.ts` |
| `settlement_regulatory.sql` | `settlement_week_stat`, `settlement_bilateral_position`, `regulatory_package` | `com.frms.ops.settlementreg` | `src/integrations/settlementRegulatory/` → `client.ts`; facades `settlementDemoStore` / `regulatoryPackageStore`; boundary `src/api/settlementRegulatoryApi.ts` |
| `remittance_approval_queue.sql` | `remittance_queue_item` | `com.frms.ops.remittance` | `src/integrations/remittanceQueue/` → `client.ts`; facade `src/state/remittanceQueueStore.ts`; boundary `src/api/remittanceQueueApi.ts` |
| `disbursement_worklist.sql` | `disbursement_item`, `disbursement_audit` | `com.frms.ops.disbursement` | `src/api/live/client.ts` + `RemittanceDisbursementPage` when `VITE_USE_LIVE_API=true` |
| `beftn_ack_processing.sql` | `beftn_ack_file`, `beftn_ack_row` | `com.frms.ops.beftn` | `/exchange-house/beftn-ack` + `src/api/live/client.ts` |
| `remittance_tracking_mla.sql` | `remittance_record`, `frms_mla_settings`, `frms_eh_entry_sequence` (+ party / money-receipt columns on `remittance_record` for A.1.3) | `com.frms.ops.remittance.track`, `com.frms.ops.compliance.mla` | Search & Tracking, MLA settings, Exchange House single-entry IDs (see `docs/API_CONTRACT.md`) |
| `blocked_remittance_report.sql` | `eh_blocked_remittance` | `com.frms.ops.remittance.blocked` | Block remittance reports (`/exchange-house/blocked-reports`); syncs when `remittance_record.status` = Stopped |
| `report_requests.sql` | `frms_report_request`, `frms_report_request_audit` | `com.frms.ops.reports` | Finance reports maker-checker queue (`/finance/reports`) and audit (`/reports/:id/audit`) |
| `finance.sql` | `finance_gl_voucher` | `com.frms.ops.finance` | Finance & GL page (`/admin/finance-gl`); voucher worklist with maker-checker, posting, Excel import |
| `incentive_distribution.sql` | `finance_incentive_distribution_batch` | `com.frms.ops.finance` | Incentive management & distribution (`/finance/incentive-distribution`); partner incentive accrual and payout staging |
| `pricing.sql` | `pricing_commission_band`, `pricing_fx_range_band`, `pricing_bank_fx_rate` | `com.frms.ops.pricing` | Pricing page (`/admin/pricing`); range-wise commissions, FX ranges, bank-wise FX rates |
| `corporate_file_mapping.sql` | `corporate_file_mapping_profile`, `corporate_file_mapping_defaults`, `corporate_incentive_tier` | `com.frms.ops.corporate` | Corporate file mapping & incentives page (`/tools/corporate-file-mapping`); Excel header mapping profiles and incentive tier parameters |
| `security_utilities.sql` | `security_utility_event` | `com.frms.ops.security` | Security utilities page (`/tools/security-utilities`); backend Luhn endpoints + audit events |
| `security_vapt.sql` | `security_vapt_finding` | `com.frms.ops.security` | VAPT findings tracker (`/tools/security-vapt`); log, track and close findings from quarterly VAPT assessment cycles |

**HTTP:** all of the above are served under **`/api/v1`** (see `application.yml` `server.servlet.context-path`). The Vite app proxies `VITE_API_BASE_PATH` to `VITE_API_PROXY_TARGET` (default port **4000**).

**Live mode:** set `VITE_USE_LIVE_API=true` in the dashboard `.env` so repositories use the Java API and refresh **browser `localStorage` caches** after mutations.
