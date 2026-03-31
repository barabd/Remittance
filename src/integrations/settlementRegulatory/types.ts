export type SettlementStatPoint = {
  day: string
  grossInBdt: number
  netSettlementBdt: number
  bilateralAdjustments: number
}

export type BilateralPosition = {
  id: string
  counterparty: string
  corridor: string
  netPositionBdt: number
  asOf: string
  multilateralBucket: 'Asia-GCC' | 'USD-corridor' | 'EUR-UK' | 'Other'
}

export type RegulatoryPackage = {
  id: string
  kind: 'net_position_daily' | 'aggregate_remittance'
  title: string
  period: string
  summary: string
  status: 'Draft' | 'Queued' | 'Sent' | 'Ack'
  destination: string
  createdAt: string
}
