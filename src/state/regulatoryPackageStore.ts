/** Demo regulatory / CB reporting queue (#32). Facade over `integrations/settlementRegulatory/regulatoryRepository`. */

export type { RegulatoryPackage } from '../integrations/settlementRegulatory/types'
export {
  advanceRegulatoryPackageDemo,
  loadRegulatoryPackages,
  queueNetPositionPackageDemo,
  REGULATORY_PACKAGE_EVENT,
} from '../integrations/settlementRegulatory/regulatoryRepository'
