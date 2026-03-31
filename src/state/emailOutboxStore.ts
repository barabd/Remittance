/**
 * Facade — logic lives in `src/integrations/operationsHub/operationsHubRepository.ts`.
 */
export type { EmailOutboxItem } from '../integrations/operationsHub/types'
export { EMAIL_OUTBOX_EVENT } from '../integrations/operationsHub/constants'
export {
  fetchEmailOutbox,
  loadEmailOutbox,
  markOutboxItemSentDemo,
  queueEmailToExchangeHouse,
  resetOutboxItemToQueued,
} from '../integrations/operationsHub/operationsHubRepository'
