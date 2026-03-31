import type { BulkHubTarget } from './types'

export const BULK_HUB_EVENT = 'bulkHub:activity'

export const BULK_HUB_LS_KEY = 'frms.bulkHub.activity.v1'

export const MAX_ACTIVITY_ENTRIES = 80

export const MAX_PREVIEW_DATA_ROWS = 8

export const BULK_ACCEPT = '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

export type BulkHubRouteCard = {
  target: BulkHubTarget
  title: string
  body: string
  to: string
}

export const BULK_HUB_CARDS: BulkHubRouteCard[] = [
  {
    target: 'exchange_bulk',
    title: 'Exchange house remittance bulk upload',
    body: '#15 — Excel / flat-file bulk remittance rows, validation, and mapping profiles.',
    to: '/exchange-house/bulk-upload',
  },
  {
    target: 'remittance_search',
    title: 'Remittance search — Excel import',
    body: 'Import additional rows into the search & tracking grid from spreadsheet.',
    to: '/remittance/search',
  },
  {
    target: 'file_mapping',
    title: 'Corporate file mapping',
    body: 'Column mapping templates for incentive tiers and partner file layouts.',
    to: '/tools/corporate-file-mapping',
  },
  {
    target: 'admin_bulk',
    title: 'Administration — bulk users / branches',
    body: 'Excel upload for user and branch master rows under Administration.',
    to: '/administration',
  },
]
