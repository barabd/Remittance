/**
 * Operations hub — unified database (MSSQL) + backend (frms-ops-api) + frontend façade.
 *
 * - Types & DB mapping: `./types`
 * - Single code path for reads/writes: `./operationsHubRepository`
 * - HTTP: `src/api/live/operationsHubClient` (used only by the repository when live)
 * - Delivery (SMTP/FCM handoff): `src/lib/opsDeliveryClient` (triggered from repository on new alerts)
 */

export * from './constants'
export * from './types'
export * from './operationsHubRepository'
