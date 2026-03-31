/**
 * Settlement analytics (#31) + regulatory packages (#32).
 *
 * Java: `com.frms.ops.settlementreg` → `GET /settlement/week-stats`, `GET /settlement/bilateral-positions`,
 * `GET|POST /regulatory/packages`, `PATCH /regulatory/packages/:id/advance`.
 *
 * Enable with `VITE_USE_LIVE_API=true` and proxy to `frms-ops-api`. Merge layer: `src/integrations/settlementRegulatory/`.
 */

export {}
