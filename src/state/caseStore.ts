/** Back-compat facade — implementation: `src/integrations/investigationCases/caseRepository`. */

export type { CaseSource, InvestigationCase } from '../integrations/investigationCases/types'

export {
  addCaseNote,
  CASES_EVENT,
  createCase,
  loadCases,
  normalizeInvestigationCase,
  setCaseStatus,
  syncInvestigationCasesFromLive,
} from '../integrations/investigationCases/caseRepository'
