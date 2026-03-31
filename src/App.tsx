import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './layout/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { AuditMonitoringPage } from './pages/AuditMonitoringPage'
import { RemittanceQueuePage } from './pages/RemittanceQueuePage'
import { AmlAlertsPage } from './pages/AmlAlertsPage'
import { ReconExceptionsPage } from './pages/ReconExceptionsPage'
import { CompanyInfoPage } from './pages/profile/CompanyInfoPage'
import { ChangePasswordPage } from './pages/profile/ChangePasswordPage'
import { RemittanceSearchPage } from './pages/RemittanceSearchPage'
import { RemittanceDisbursementPage } from './pages/RemittanceDisbursementPage'
import { FinanceGlPage } from './pages/FinanceGlPage'
import { AdministrationPage } from './pages/AdministrationPage'
import { ExchangeHouseBulkUploadPage } from './pages/ExchangeHouseBulkUploadPage'
import { BeneficiaryManagementPage } from './pages/masters/BeneficiaryManagementPage'
import { AgentManagementPage } from './pages/masters/AgentManagementPage'
import { CoverFundManagementPage } from './pages/masters/CoverFundManagementPage'
import { PricingPage } from './pages/pricing/PricingPage'
import { FxConverterPage } from './pages/tools/FxConverterPage'
import { OperationsHubPage } from './pages/operations/OperationsHubPage'
import { RulesReferencePage } from './pages/compliance/RulesReferencePage'
import { CorporateFileMappingPage } from './pages/tools/CorporateFileMappingPage'
import { SettlementRegulatoryDemoPage } from './pages/operations/SettlementRegulatoryDemoPage'
import { IntegrationsDemoPage } from './pages/integrations/IntegrationsDemoPage'
import { IncentiveDistributionDemoPage } from './pages/finance/IncentiveDistributionDemoPage'
import { SecurityUtilitiesPage } from './pages/tools/SecurityUtilitiesPage'
import { SecurityVaptPage } from './pages/tools/SecurityVaptPage'
import { RiskControlPage } from './pages/compliance/RiskControlPage'
import { AmlComplianceSettingsPage } from './pages/compliance/AmlComplianceSettingsPage'
import { InvestigationCasesPage } from './pages/operations/InvestigationCasesPage'
import { RemittanceSingleEntryPage } from './pages/exchange-house/RemittanceSingleEntryPage'
import { BlockRemittanceReportsPage } from './pages/exchange-house/BlockRemittanceReportsPage'
import { BeftnAckProcessingPage } from './pages/exchange-house/BeftnAckProcessingPage'
import { ReconciliationSlabsPage } from './pages/reconciliation/ReconciliationSlabsPage'
import { HeadOfficeModulePage } from './pages/head-office/HeadOfficeModulePage'
import { HeadOfficePermissionsPage } from './pages/head-office/HeadOfficePermissionsPage'
import { UserRightsModulePage } from './pages/security/UserRightsModulePage'
import { BulkDataHubPage } from './pages/operations/BulkDataHubPage'
import { ReportsPage } from './pages/finance/ReportsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/operations/hub" element={<OperationsHubPage />} />
        <Route path="/operations/bulk-data-hub" element={<BulkDataHubPage />} />
        <Route path="/operations/investigation-cases" element={<InvestigationCasesPage />} />
        <Route
          path="/operations/settlement-regulatory"
          element={<SettlementRegulatoryDemoPage />}
        />
        <Route path="/integrations/hub" element={<IntegrationsDemoPage />} />

        <Route path="/remittance/queue" element={<RemittanceQueuePage />} />
        <Route path="/compliance/alerts" element={<AmlAlertsPage />} />
        <Route path="/compliance/risk-controls" element={<RiskControlPage />} />
        <Route path="/compliance/mla-settings" element={<AmlComplianceSettingsPage />} />
        <Route path="/compliance/rules" element={<RulesReferencePage />} />
        <Route
          path="/reconciliation/exceptions"
          element={<ReconExceptionsPage />}
        />
        <Route path="/reconciliation/slabs" element={<ReconciliationSlabsPage />} />
        <Route
          path="/remittance/disbursement"
          element={<RemittanceDisbursementPage />}
        />
        <Route
          path="/masters/beneficiaries"
          element={<BeneficiaryManagementPage />}
        />
        <Route path="/masters/agents" element={<AgentManagementPage />} />

        <Route
          path="/remittance/search"
          element={<RemittanceSearchPage />}
        />
        <Route
          path="/exchange-house/bulk-upload"
          element={<ExchangeHouseBulkUploadPage />}
        />
        <Route
          path="/exchange-house/single-entry"
          element={<RemittanceSingleEntryPage />}
        />
        <Route
          path="/exchange-house/blocked-reports"
          element={<BlockRemittanceReportsPage />}
        />
        <Route path="/exchange-house/beftn-ack" element={<BeftnAckProcessingPage />} />
        <Route
          path="/finance/gl"
          element={<FinanceGlPage />}
        />
        <Route
          path="/finance/cover-funds"
          element={<CoverFundManagementPage />}
        />
        <Route path="/finance/pricing" element={<PricingPage />} />
        <Route
          path="/finance/incentive-distribution"
          element={<IncentiveDistributionDemoPage />}
        />
        <Route path="/finance/reports" element={<ReportsPage />} />
        <Route path="/reports" element={<Navigate to="/finance/reports" replace />} />
        <Route path="/tools/fx-converter" element={<FxConverterPage />} />
        <Route path="/tools/corporate-file-mapping" element={<CorporateFileMappingPage />} />
        <Route path="/tools/security-utilities" element={<SecurityUtilitiesPage />} />
        <Route path="/tools/security-vapt" element={<SecurityVaptPage />} />
        <Route
          path="/administration"
          element={<AdministrationPage />}
        />
        <Route path="/head-office/module" element={<HeadOfficeModulePage />} />
        <Route path="/head-office/permissions" element={<HeadOfficePermissionsPage />} />
        <Route path="/security/user-rights" element={<UserRightsModulePage />} />
        <Route path="/audit" element={<AuditMonitoringPage />} />

        <Route path="/profile/company" element={<CompanyInfoPage />} />
        <Route path="/profile/change-password" element={<ChangePasswordPage />} />

        <Route path="*" element={<PlaceholderPage title="Not Found" />} />
      </Route>
    </Routes>
  )
}
