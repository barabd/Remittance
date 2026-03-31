# frms-ops-api

Spring Boot 3 service for FRMS admin data: **operations hub** (notifications, email outbox, feedback), **masters** (beneficiaries, agents, cover funds), **AML alerts**, **investigation cases**, plus optional SMTP/FCM delivery. Persists to **Microsoft SQL Server**.

## Prerequisites

- JDK 17+
- Maven 3.9+
- SQL Server with database `frms_ops` (or let Hibernate `ddl-auto=update` create tables on first run)

## Run

```bash
cd server/frms-ops-api
mvn spring-boot:run
```

Listens on **port 4000** with context path **`/api/v1`** (matches `VITE_API_PROXY_TARGET` in the Vite app).

## Configuration

Override via environment variables (see `src/main/resources/application.yml`):

| Variable | Purpose |
|----------|---------|
| `FRMS_JDBC_URL` | JDBC URL for SQL Server |
| `FRMS_DB_USER` | DB user |
| `FRMS_DB_PASSWORD` | DB password |

## SMTP (real send)

Set `FRMS_OPS_MAIL_ENABLED=true` and SMTP settings. Spring’s default mail auto-config is **disabled**; this app builds `JavaMailSender` only when mail is enabled.

| Variable | Purpose |
|----------|---------|
| `FRMS_OPS_MAIL_ENABLED` | `true` to send mail |
| `FRMS_SMTP_HOST` | SMTP host (required when enabled) |
| `FRMS_SMTP_PORT` | Default `587` |
| `FRMS_SMTP_USER` / `FRMS_SMTP_PASSWORD` | Auth (e.g. SendGrid: user `apikey`, password = API key) |
| `FRMS_MAIL_FROM` | From address (defaults to username if empty) |
| `FRMS_SMTP_AUTH` | Default `true` |
| `FRMS_SMTP_STARTTLS` | Default `true` |

`POST /api/v1/operations/delivery/email` sends **plain text** using `bodyText` or `bodyPreview`. When mail is disabled, the endpoint still returns **200** with a message that nothing was sent.

## FCM (Firebase Cloud Messaging)

1. Create a Firebase project, enable Cloud Messaging, download a **service account JSON**.
2. Set `FRMS_OPS_FCM_ENABLED=true` and either:
   - `FRMS_FCM_CREDENTIALS_PATH` — absolute path to the JSON file (recommended), or
   - `FRMS_FCM_CREDENTIALS_JSON` — inline JSON (dev only).
3. Optional: `FRMS_FCM_TOPIC` (default `ops-alerts`). Mobile/web clients must **subscribe** to this topic to receive topic pushes.

`POST /api/v1/operations/delivery/push` sends a **data-only** message. If the JSON body includes `fcmToken`, that device is targeted; otherwise the configured **topic** is used. When FCM is disabled, the endpoint returns **200** without sending. If FCM is enabled and `send` fails, the API returns **500** with `{ ok: false, message }`.

## Frontend

The dashboard keeps one code path for this data in `admin-dashboard/src/integrations/operationsHub/` (merged with browser storage when `VITE_USE_LIVE_API` is false).

1. Start SQL Server and this API.
2. In the admin-dashboard repo: set `VITE_USE_LIVE_API=true` and `npm run dev`.
3. Point delivery URLs (see root `.env.example`):
   - `VITE_OPS_EMAIL_SEND_API_URL=/api/v1/operations/delivery/email`
   - `VITE_OPS_PUSH_SEND_API_URL=/api/v1/operations/delivery/push`
4. Open `/operations/hub`.

DDL scripts and **full stack map** (SQL ↔ Java ↔ React): `../../database/mssql/README.md`. Scripts: `operations_hub.sql`, `masters_aml.sql`, `investigation_cases.sql`, `bulk_hub_log.sql`.
