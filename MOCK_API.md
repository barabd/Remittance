# Mock API Server Setup

## Overview

A mock FRMS Operations API server has been created to eliminate "Backend unavailable (502/503)" errors while developing the admin dashboard. This server:

- ✅ Listens on port 4000
- ✅ Implements all `/api/v1/*` endpoints the dashboard needs
- ✅ Returns realistic mock data for integration testing
- ✅ Requires **zero external dependencies** (no Java, Maven, Docker, or MSSQL needed)

## Files Created

- **`server/mock-api.mjs`** — Mock API server implementation
- **`dev-full.mjs`** — Helper script to start both API and Vite dev server together
- **Updated `package.json`** — New npm scripts for easy startup

## How to Use

### Option 1: Run Everything at Once (Recommended)

```bash
npm run dev:full
```

This starts both the mock API server (port 4000) and Vite dev server (port 5173) simultaneously.

### Option 2: Run Separately

**Terminal 1 — Start mock API:**
```bash
npm run dev:api
```

**Terminal 2 — Start Vite dev server:**
```bash
npm run dev:vite
```

### Option 3: Using Existing Setup

The mock API is currently **already running** in the background on port 4000. The Vite proxy in `vite.config.ts` automatically forwards all `/api/v1/*` requests to it.

Just run the dashboard normally:
```bash
npm run dev
```

## Endpoints Supported

All green buttons on `/integrations/hub` now work:

| Endpoint | Method | Path |
|----------|--------|------|
| Dashboard metrics | GET | `/api/v1/metrics/dashboard` |
| Investigation cases | GET | `/api/v1/investigation-cases` |
| Bulk hub events | GET | `/api/v1/bulk-hub/events` |
| Settlement week stats | GET | `/api/v1/settlement/week-stats` |
| Regulatory packages | GET | `/api/v1/regulatory/packages` |
| Remittance queue | GET | `/api/v1/remittances/queue` |
| Blocked remittances | GET | `/api/v1/exchange-house/blocked-remittances` |
| Screen parties (compliance) | POST | `/api/v1/compliance/screen` |
| List integrations | GET | `/api/v1/integrations/connectors` |
| Sync connector | PATCH | `/api/v1/integrations/connectors/{id}` |
| List webhooks | GET | `/api/v1/integrations/webhooks` |
| Record webhook | POST | `/api/v1/integrations/webhooks` |

## Switching to Real Backend

When you're ready to use the real Java backend:

1. Ensure you have JDK 17+, Maven 3.9+, and SQL Server installed
2. Start MSSQL (or use Docker Compose with `docker compose -f server/docker-compose.mssql.yml up -d`)
3. Build and run the Java backend: `cd server/frms-ops-api && mvn spring-boot:run`
4. Set environment variable: `VITE_USE_LIVE_API=true`
5. Run the dashboard normally: `npm run dev`

The Vite proxy will automatically route requests to `http://localhost:4000` (the real backend).

## Troubleshooting

**Port 4000 already in use?**
```bash
# Windows: Find and kill the process
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:4000 | xargs kill -9
```

**Vite is not proxying requests properly?**
- Check `vite.config.ts` — it should have the proxy configured for `/api/v1`
- The default target is `http://127.0.0.1:4000`
- You can override with environment variable: `VITE_API_PROXY_TARGET=http://your-backend:4000`

## What's Different from Real Backend

The mock API:
- Returns **consistent demo data** (no database changes persisted)
- Has **no authentication** (no bearer token validation)
- Simulates actions instantly (no processing delays)
- Does **not** connect to MSSQL

For production or detailed testing, use the real Java backend with actual MSSQL.
