export type MasterApprovalStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Active'
  | 'Approved'
  | 'Rejected'
  | 'On Hold'

export type BeneficiaryRecord = {
  id: string
  fullName: string
  phone: string
  idDocumentRef: string
  bankName: string
  bankAccountMasked: string
  branch: string
  status: MasterApprovalStatus
  maker: string
  checker?: string
  createdAt: string
  notes?: string
}

export type AgentRecord = {
  id: string
  code: string
  name: string
  type: 'Exchange House' | 'Correspondent' | 'Branch Agent'
  country: string
  contactPhone: string
  walletBalance: number
  commissionRate: number
  status: MasterApprovalStatus
  maker: string
  checker?: string
  createdAt: string
  notes?: string
}

export type CoverFundRecord = {
  id: string
  fundCode: string
  partnerName: string
  currency: string
  balanceAmount: number
  status: MasterApprovalStatus
  maker: string
  checker?: string
  updatedAt: string
  notes?: string
}
