/**
 * Integration boundary for remittance master data (browser cache + optional live API).
 *
 * Implementation: `src/integrations/masters/mastersRepository.ts` → `src/api/live/client.ts` when `VITE_USE_LIVE_API=true`.
 */

export {
  loadBeneficiaries,
  saveBeneficiaries,
  loadAgents,
  saveAgents,
  loadCoverFunds,
  saveCoverFunds,
  addBeneficiary,
  updateBeneficiary,
  addAgent,
  updateAgent,
  addCoverFund,
  updateCoverFund,
  setMasterStatusBeneficiary,
  setMasterStatusAgent,
  setMasterStatusCoverFund,
  getMastersDashboardCounts,
  MASTERS_CHANGED_EVENT,
} from '../state/mastersStore'

export type {
  BeneficiaryRecord,
  AgentRecord,
  CoverFundRecord,
  MasterApprovalStatus,
} from '../state/mastersStore'
