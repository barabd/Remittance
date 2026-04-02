export type AmlAlertRow = {
  id: string
  remittanceNo: string
  screenedAt: string
  match: 'None' | 'Possible'
  list: 'OFAC' | 'Local' | 'OSFI' | 'VendorAPI' | 'OPAC' | 'DSRI' | 'UN' | 'BFIU'
  score: number
  status: 'Open' | 'Investigating' | 'Resolved' | 'False Positive'
  /** Party that triggered the hit (remitter / beneficiary / both) */
  subjectHint?: string
}
