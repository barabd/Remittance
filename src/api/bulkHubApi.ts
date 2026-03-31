/**
 * Integration boundary for bulk data hub preview audit (browser cache + optional `frms-ops-api`).
 *
 * | Layer | Location |
 * |-------|----------|
 * | Database | `database/mssql/bulk_hub_log.sql` (+ Hibernate `ddl-auto` on `BulkHubEventEntity`) |
 * | Backend | `server/frms-ops-api/.../bulk/BulkHubEventController.java` (`GET`/`POST` `/bulk-hub/events`) |
 * | Frontend merge | `src/integrations/bulkDataHub/bulkHubRepository.ts` |
 * | Page + parse | `src/pages/operations/BulkDataHubPage.tsx`, `parseSpreadsheetPreview.ts` |
 * | Live HTTP | `src/api/live/client.ts` (`liveListBulkHubEvents`, `livePostBulkHubEvent`) |
 * | SPA facade | `src/state/bulkHubStore.ts` |
 *
 * Enable with `VITE_USE_LIVE_API=true` and `VITE_API_PROXY_TARGET` → Spring Boot (default port 4000).
 */

export type { BulkHubActivityEntry, BulkHubTarget, SpreadsheetPreview } from '../integrations/bulkDataHub/types'

export {
  BULK_HUB_EVENT,
  loadBulkHubActivity,
  normalizeBulkHubEventDto,
  recordBulkHubPreview,
  syncBulkHubActivityFromLive,
} from '../integrations/bulkDataHub/bulkHubRepository'
