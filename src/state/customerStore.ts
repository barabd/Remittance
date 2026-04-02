export type CustomerStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Disabled'

export type CustomerRecord = {
  id: string
  name: string
  nid: string
  passport?: string
  phone: string
  email: string
  photoUrl?: string
  status: CustomerStatus
  maker: string
  checker?: string
  createdAt: string
  updatedAt: string
}

export const CUSTOMERS_CHANGED_EVENT = 'customers:changed'

const STORAGE_KEY = 'master_customers_v1'

const MOCK_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'CUST-001',
    name: 'Rahim Uddin',
    nid: '1234567890123',
    passport: 'A12345678',
    phone: '01711223344',
    email: 'rahim@example.com',
    status: 'Approved',
    maker: 'Ops-Agent-01',
    checker: 'HO-Admin',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-03-20T14:00:00Z',
  },
  {
    id: 'CUST-002',
    name: 'Karim Hasan',
    nid: '9876543210987',
    passport: 'B98765432',
    phone: '01811556677',
    email: 'karim@example.com',
    status: 'Pending Approval',
    maker: 'Ops-Agent-02',
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-04-01T09:00:00Z',
  },
]

export function loadCustomers(): CustomerRecord[] {
  const s = localStorage.getItem(STORAGE_KEY)
  if (!s) return MOCK_CUSTOMERS
  try {
    return JSON.parse(s) as CustomerRecord[]
  } catch {
    return MOCK_CUSTOMERS
  }
}

export function saveCustomers(list: CustomerRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent(CUSTOMERS_CHANGED_EVENT))
}

export function addCustomer(input: Omit<CustomerRecord, 'id' | 'status' | 'maker' | 'createdAt' | 'updatedAt'>) {
  const list = loadCustomers()
  const now = new Date().toISOString()
  const next: CustomerRecord = {
    ...input,
    id: `CUST-${String(list.length + 1).padStart(3, '0')}`,
    status: 'Pending Approval',
    maker: 'HO-Admin', // Default for demo
    createdAt: now,
    updatedAt: now,
  }
  saveCustomers([next, ...list])
  return next
}

export function updateCustomer(id: string, patch: Partial<CustomerRecord>) {
  const list = loadCustomers()
  const idx = list.findIndex((c) => c.id === id)
  if (idx === -1) return
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() }
  saveCustomers([...list])
}

export function setCustomerStatus(id: string, status: CustomerStatus, checker: string = 'HO-Admin') {
  updateCustomer(id, { status, checker })
}
