/**
 * Demo datasets for “Report and Statement List” — replace with API-backed queries in production.
 */

export const REPORT_KEYS = [
  'Detail General Ledger',
  'Daily GL Transaction',
  'GL Vouchers Cash Bank Certificates',
  'Cash Book',
  'Bank Book',
  'Account Details',
  'Trial Balance',
  'Income and Expense',
  'Balance Sheet',
  'Bank wise Remittance Statement',
  'Remittance Transactions',
  'Remittance History',
  'Duplicate Acknowledgement Receipt',
  'Cumulative Summary',
  'Remittance Certificate',
  'Day Wise Total Summary',
  'Remittance Detail All Banks',
  'Remittance Detail Individual Bank',
  'Branch Sub-Branch Remittance Details',
  'Audit Trail User Date',
  'Date Wise Audit Statement',
  'User Wise Remittance Audit',
  'User Information',
  'User Rights Information',
  'Setup Information',
  'Chart of Accounts',
  'Branch Sub-Branch Code Information',
  'Account Pay Remittance (Exchange House)',
  'User Activity Log',
  'Profit Report',
  'Custom Report Request',
] as const

export type ReportKey = (typeof REPORT_KEYS)[number]

export function isReportKey(s: string): s is ReportKey {
  return (REPORT_KEYS as readonly string[]).includes(s)
}

type Row = Record<string, unknown>

export function buildReportDataset(reportName: ReportKey, periodFrom: string, periodTo: string): Row[] {
  const gen = new Date().toISOString()
  const c = { reportName, periodFrom, periodTo, generatedAt: gen }

  const glLine = (extra: Row): Row => ({ ...c, ...extra })

  switch (reportName) {
    case 'Detail General Ledger':
      return [
        glLine({ accountCode: '1110', accountName: 'Cash in vault', txnDate: periodFrom, docNo: 'VCH-071', narration: 'Opening', debit: 0, credit: 0, balance: 1250000 }),
        glLine({ accountCode: '1110', accountName: 'Cash in vault', txnDate: periodFrom, docNo: 'VCH-072', narration: 'Remittance payout', debit: 0, credit: 450000, balance: 800000 }),
        glLine({ accountCode: '2120', accountName: 'Partner settlement payable', txnDate: periodFrom, docNo: 'VCH-072', narration: 'BEFTN batch', debit: 295000, credit: 0, balance: 1200000 }),
      ]

    case 'Daily GL Transaction':
      return [
        glLine({ account: 'Cash on hand', voucherNo: 'VCH-071', debit: 120000, credit: 45000, type: 'Journal' }),
        glLine({ account: 'Partner settlement', voucherNo: 'VCH-072', debit: 295000, credit: 0, type: 'Bank' }),
        glLine({ account: 'Fee income', voucherNo: 'VCH-073', debit: 0, credit: 12500, type: 'Journal' }),
      ]

    case 'GL Vouchers Cash Bank Certificates':
      return [
        glLine({ voucherType: 'Cash', voucherNo: 'CSH-2401', certificateRef: 'CERT-CSH-01', amount: 60000, status: 'Posted' }),
        glLine({ voucherType: 'Bank', voucherNo: 'BNK-8821', certificateRef: 'REM-CERT-8821', amount: 295000, status: 'Posted' }),
        glLine({ voucherType: 'Remittance', voucherNo: 'REM-2026-000210', certificateRef: 'RCPT-EH-210', amount: 2500, ccy: 'USD', status: 'Approved' }),
      ]

    case 'Cash Book':
      return [
        glLine({ bookDate: periodFrom, receiptNo: 'CR-9001', particulars: 'Cash remittance in', inward: 185000, outward: 0, balance: 800000 }),
        glLine({ bookDate: periodFrom, receiptNo: 'CP-9002', particulars: 'Branch payout', inward: 0, outward: 120000, balance: 680000 }),
      ]

    case 'Bank Book':
      return [
        glLine({ bookDate: periodFrom, bank: 'Nostro USD', chqRef: 'BEFTN-BATCH-12', deposit: 500000, withdrawal: 0, balance: 4200000 }),
        glLine({ bookDate: periodFrom, bank: 'Nostro BDT', chqRef: 'RTGS-7781', deposit: 0, withdrawal: 1325000, balance: 8900000 }),
      ]

    case 'Account Details':
      return [
        glLine({ accountCode: '1110', accountName: 'Cash in vault', opening: 1250000, movementDr: 200000, movementCr: 650000, closing: 800000 }),
        glLine({ accountCode: '4100', accountName: 'Remittance fee income', opening: 0, movementDr: 0, movementCr: 12500, closing: 12500 }),
      ]

    case 'Trial Balance':
      return [
        glLine({ account: 'Cash on hand', debit: 120000, credit: 45000 }),
        glLine({ account: 'Partner settlement', debit: 295000, credit: 0 }),
        glLine({ account: 'Fee income', debit: 0, credit: 12500 }),
      ]

    case 'Income and Expense':
      return [
        glLine({ category: 'Income', line: 'Remittance fees', amount: 12500, mtd: 89000, ytd: 240000 }),
        glLine({ category: 'Income', line: 'FX spread', amount: 4200, mtd: 31000, ytd: 98000 }),
        glLine({ category: 'Expense', line: 'Correspondent charges', amount: 2100, mtd: 15000, ytd: 44000 }),
      ]

    case 'Balance Sheet':
      return [
        glLine({ section: 'Assets', line: 'Cash & bank', amount: 5020000 }),
        glLine({ section: 'Assets', line: 'Receivables — partners', amount: 1200000 }),
        glLine({ section: 'Liabilities', line: 'Settlement payable', amount: 3100000 }),
        glLine({ section: 'Equity', line: 'Retained', amount: 3120000 }),
      ]

    case 'Bank wise Remittance Statement':
    case 'Remittance Transactions':
    case 'Remittance History':
      return [
        glLine({ remittanceNo: 'REM-2026-000210', corridor: 'USD → BDT', amount: '2,500.00 USD', bank: 'Bank A', status: 'Approved' }),
        glLine({ remittanceNo: 'REM-2026-000211', corridor: 'AED → BDT', amount: '4,000.00 AED', bank: 'Bank B', status: 'Pending Approval' }),
      ]

    case 'Duplicate Acknowledgement Receipt':
      return [
        glLine({ receiptNo: 'ACK-001', remittanceNo: 'REM-2026-000210', exchangeHouse: 'EH-GULF-01', firstSeen: '2026-03-25 09:10', duplicateFlag: 'No' }),
        glLine({ receiptNo: 'ACK-442', remittanceNo: 'REM-2026-000099', exchangeHouse: 'EH-RUH-02', firstSeen: '2026-03-24 14:22', duplicateFlag: 'Yes — blocked' }),
      ]

    case 'Cumulative Summary':
      return [
        glLine({ metric: 'Total outward remittance (period)', valueBdt: 128500000, txnCount: 8420 }),
        glLine({ metric: 'Total inward settlement', valueBdt: 126200000, txnCount: 8310 }),
      ]

    case 'Remittance Certificate':
      return [
        glLine({ certificateNo: 'CERT-2026-1042', remittanceNo: 'REM-2026-000210', beneficiary: 'Rahim Uddin', amount: '2,500.00 USD', issuedAt: gen }),
      ]

    case 'Day Wise Total Summary':
      return [
        glLine({ valueDate: periodFrom, totalUsd: 1250000, totalAed: 890000, totalBdtEq: 285000000, count: 412 }),
        glLine({ valueDate: periodTo, totalUsd: 980000, totalAed: 720000, totalBdtEq: 241000000, count: 398 }),
      ]

    case 'Remittance Detail All Banks':
      return [
        glLine({ bank: 'Bank A', remittanceNo: 'REM-2026-000210', beneficiary: 'Rahim Uddin', channel: 'BEFTN', amountBdt: 305000 }),
        glLine({ bank: 'Bank B', remittanceNo: 'REM-2026-000211', beneficiary: 'Karim Mia', channel: 'MFS', amountBdt: 132500 }),
      ]

    case 'Remittance Detail Individual Bank':
      return [
        glLine({ bankFilter: 'Bank A', remittanceNo: 'REM-2026-000210', payoutTo: '0123****89', amount: '2,500.00 USD', status: 'Paid' }),
      ]

    case 'Branch Sub-Branch Remittance Details':
      return [
        glLine({ branch: 'Branch-01', subBranch: '—', remittanceNo: 'REM-2026-000210', count: 1, amountBdt: 305000 }),
        glLine({ branch: 'Branch-02', subBranch: 'Sub-Branch-03', remittanceNo: 'REM-2026-000211', count: 1, amountBdt: 132500 }),
      ]

    case 'Audit Trail User Date':
    case 'Date Wise Audit Statement':
    case 'User Wise Remittance Audit':
    case 'User Activity Log':
      return [
        glLine({ at: `${periodFrom} 09:01`, userId: 'HO-Admin', action: 'Login', module: 'Core', ip: '10.10.10.10' }),
        glLine({ at: `${periodFrom} 10:11`, userId: 'Finance-01', action: 'Approved voucher', module: 'GL', ip: '10.10.10.12' }),
        glLine({ at: `${periodTo} 15:40`, userId: 'Branch-01', action: 'Remittance approve', module: 'Remittance', ip: '10.20.1.5' }),
      ]

    case 'User Information':
      return [
        glLine({ userId: 'HO-Admin', name: 'Head Office Admin', branch: 'HO', role: 'Administrator', status: 'Active', lastLogin: gen }),
        glLine({ userId: 'Finance-01', name: 'Finance User', branch: 'HO', role: 'Finance', status: 'Active', lastLogin: gen }),
      ]

    case 'User Rights Information':
      return [
        glLine({ userId: 'HO-Admin', screen: 'Reports', canView: 'Yes', canCreate: 'Yes', canApprove: 'Yes' }),
        glLine({ userId: 'Branch-01', screen: 'Remittance Search', canView: 'Yes', canCreate: 'Yes', canApprove: 'No' }),
      ]

    case 'Setup Information':
      return [
        glLine({ key: 'Company legal name', value: 'Demo Remittance Ltd.' }),
        glLine({ key: 'Base currency', value: 'BDT' }),
        glLine({ key: 'Fiscal year start', value: '01-07' }),
      ]

    case 'Chart of Accounts':
      return [
        glLine({ code: '1110', name: 'Cash in vault', type: 'Asset', level: 3, posting: 'Yes' }),
        glLine({ code: '2120', name: 'Partner settlement payable', type: 'Liability', level: 3, posting: 'Yes' }),
        glLine({ code: '4100', name: 'Remittance fee income', type: 'Income', level: 3, posting: 'Yes' }),
      ]

    case 'Branch Sub-Branch Code Information':
      return [
        glLine({ branchCode: 'BR01', branchName: 'Dhaka Main', subBranchCode: '—', subBranchName: '—', status: 'Active' }),
        glLine({ branchCode: 'BR02', branchName: 'Chittagong', subBranchCode: 'SBR03', subBranchName: 'Agrabad Booth', status: 'Active' }),
      ]

    case 'Account Pay Remittance (Exchange House)':
      return [
        {
          ...c,
          exchangeHouse: 'EH-GULF-01',
          remittanceNo: 'REM-2026-000210',
          beneficiaryAccount: '0123****89 · Bank A',
          amount: '2,500.00 USD',
          bdtEquivalent: '305,000.00',
          payType: 'Account pay',
          status: 'Approved',
        },
        {
          ...c,
          exchangeHouse: 'EH-RUH-02',
          remittanceNo: 'REM-2026-000211',
          beneficiaryAccount: '77********01 · Bank B',
          amount: '4,000.00 AED',
          bdtEquivalent: '132,500.00',
          payType: 'Account pay',
          status: 'Pending Approval',
        },
      ]

    case 'Profit Report':
      return [
        glLine({ category: 'Gross Revenue', item: 'Remittance Fees', amount: 850000, margin: '15%' }),
        glLine({ category: 'Gross Revenue', item: 'FX Spread', amount: 320000, margin: '22%' }),
        glLine({ category: 'Direct Expense', item: 'Agent Commission', amount: -450000, margin: '—' }),
        glLine({ category: 'Net Profit', item: 'Monthly Total', amount: 720000, margin: '—' }),
      ]

    case 'Custom Report Request':
      return [
        glLine({
          note: 'Additional reports can be customized; export this template and attach requirements.',
          contact: 'reporting@example.com',
          reference: `REQ-${periodFrom.replace(/-/g, '')}`,
        }),
      ]

    default:
      return [{ ...c, message: 'No dataset' }]
  }
}
