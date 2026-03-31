/**
 * Back-compat facade for bulk hub activity + preview helpers — see `src/integrations/bulkDataHub/`.
 */

export type { BulkHubActivityEntry, BulkHubTarget, SpreadsheetPreview } from '../integrations/bulkDataHub/types'

export {
  BULK_ACCEPT,
  BULK_HUB_CARDS,
  BULK_HUB_EVENT,
  loadBulkHubActivity,
  MAX_ACTIVITY_ENTRIES,
  MAX_PREVIEW_DATA_ROWS,
  normalizeBulkHubEventDto,
  parseSpreadsheetPreview,
  recordBulkHubPreview,
  syncBulkHubActivityFromLive,
} from '../integrations/bulkDataHub'

export type { BulkHubRouteCard } from '../integrations/bulkDataHub'
