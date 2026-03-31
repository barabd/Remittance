/**
 * Facade — logic lives in `src/integrations/operationsHub/operationsHubRepository.ts` (DB + API + local merged).
 */
export type { OperationalNotification, OperationalNotificationKind } from '../integrations/operationsHub/types'
export { OPERATIONAL_NOTIFICATIONS_EVENT } from '../integrations/operationsHub/constants'
export {
  fetchOperationalNotifications,
  fetchUnreadOperationalNotificationCount,
  loadOperationalNotifications,
  markAllOperationalRead,
  markOperationalRead,
  pushOperationalNotification,
  unreadOperationalCount,
} from '../integrations/operationsHub'
