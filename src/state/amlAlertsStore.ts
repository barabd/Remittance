/** Back-compat facade for AML alert rows — see `src/integrations/aml`. */

export type { AmlAlertRow } from '../integrations/aml/types'

export {
  AML_ALERTS_CHANGED_EVENT,
  appendAmlAlert,
  createAmlAlertFromScreening,
  loadAmlAlerts,
  openAmlAlertCount,
  updateAmlAlertStatus,
} from '../integrations/aml/amlRepository'
