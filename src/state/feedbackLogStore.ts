/**
 * Facade — logic lives in `src/integrations/operationsHub/operationsHubRepository.ts`.
 */
export type { FeedbackLogEntry, FeedbackSource } from '../integrations/operationsHub/types'
export { FEEDBACK_LOG_EVENT } from '../integrations/operationsHub/constants'
export {
  appendFeedback,
  fetchFeedbackLog,
  loadFeedbackLog,
} from '../integrations/operationsHub/operationsHubRepository'
