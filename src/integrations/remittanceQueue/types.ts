export type RemittanceQueuePayType = 'Cash' | 'Account pay'

export type RemittanceQueueStatus = 'Pending Approval' | 'On Hold' | 'Approved' | 'Rejected'

/** Row shape for Approvals Queue (A.1.4 #1–#2). */
export type RemittanceQueueRow = {
  id: string
  remittanceNo: string
  createdAt: string
  corridor: string
  amount: string
  maker: string
  payType: RemittanceQueuePayType
  exchangeHouse: string
  status: RemittanceQueueStatus
}
