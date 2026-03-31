/**
 * Integration boundary for investigation cases (browser cache + optional `frms-ops-api`).
 *
 * | Layer | Location |
 * |-------|----------|
 * | Database | `database/mssql/investigation_cases.sql` (+ Hibernate `ddl-auto` on entities) |
 * | Backend | `server/frms-ops-api/.../cases/InvestigationCaseController.java` |
 * | Frontend merge | `src/integrations/investigationCases/caseRepository.ts` |
 * | Live HTTP | `src/api/live/client.ts` (`liveListInvestigationCases`, …) |
 *
 * Enable with `VITE_USE_LIVE_API=true` and `VITE_API_PROXY_TARGET` → Spring Boot (default port 4000).
 */

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

export type { CreateCaseInput } from '../integrations/investigationCases/caseRepository'
