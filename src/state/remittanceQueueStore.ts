/**
 * Approvals queue facade (A.1.4 #1–#2) — `src/integrations/remittanceQueue/remittanceQueueRepository`.
 */

export type { RemittanceQueueRow } from '../integrations/remittanceQueue/types'
export {
  approveQueueItem,
  DEFAULT_QUEUE_CHECKER_USER,
  loadQueueRows,
  REMITTANCE_QUEUE_EVENT,
  rejectQueueItem,
  syncRemittanceQueueFromLive,
} from '../integrations/remittanceQueue/remittanceQueueRepository'
