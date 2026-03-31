export type CaseSource = 'AML' | 'Reconciliation' | 'Operational'

export type CaseNoteRow = { at: string; by: string; text: string }

export type InvestigationCase = {
  id: string
  title: string
  source: CaseSource
  ref?: string
  subject?: string
  priority: 'Low' | 'Medium' | 'High'
  status: 'Open' | 'Investigating' | 'Closed'
  assignee: string
  createdAt: string
  notes: CaseNoteRow[]
}
