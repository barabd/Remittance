export type AmlAlertRow = {
  id: string
  remittanceNo: string
  screenedAt: string
  match: 'None' | 'Possible'
  list: 'OFAC' | 'Local' | 'OSFI' | 'VendorAPI' | 'OPAC' | 'DSRI'
  score: number
  status: 'Open' | 'Investigating'
  /** Party that triggered the hit (remitter / beneficiary / both) */
  subjectHint?: string
}
