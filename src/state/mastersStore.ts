/**
 * Back-compat facade: masters live in `src/integrations/masters` (local + `mastersRepository`).
 */

export { nextId, nowTs } from '../lib/datetimeIds'

export type {
  AgentRecord,
  BeneficiaryRecord,
  CoverFundRecord,
  MasterApprovalStatus,
} from '../integrations/masters/types'

export {
  DEFAULT_CHECKER,
  DEFAULT_MAKER,
  MASTERS_CHANGED_EVENT,
} from '../integrations/masters/constants'

export type { MastersPullScope } from '../integrations/masters/mastersRepository'

export {
  addAgent,
  addBeneficiary,
  addCoverFund,
  getMastersDashboardCounts,
  loadAgents,
  loadBeneficiaries,
  loadCoverFunds,
  saveAgents,
  saveBeneficiaries,
  saveCoverFunds,
  setMasterStatusAgent,
  setMasterStatusBeneficiary,
  setMasterStatusCoverFund,
  syncMastersFromLive,
  updateAgent,
  updateBeneficiary,
  updateCoverFund,
} from '../integrations/masters/mastersRepository'
