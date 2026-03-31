/** Sequential IDs for Exchange House (Abroad) demo — replace with Oracle sequences + Java API. */

type SeqState = {
  remitter: number
  beneficiary: number
  remittance: number
  receipt: number
}

const KEY = 'frms.abroad.sequences.v1'

function read(): SeqState {
  try {
    const s = localStorage.getItem(KEY)
    if (!s) return { remitter: 0, beneficiary: 0, remittance: 0, receipt: 0 }
    return { ...JSON.parse(s) } as SeqState
  } catch {
    return { remitter: 0, beneficiary: 0, remittance: 0, receipt: 0 }
  }
}

function write(st: SeqState) {
  localStorage.setItem(KEY, JSON.stringify(st))
}

function pad6(n: number) {
  return String(n).padStart(6, '0')
}

export function nextAbroadIds() {
  const y = new Date().getFullYear()
  const st = read()
  st.remitter += 1
  st.beneficiary += 1
  st.remittance += 1
  st.receipt += 1
  write(st)
  return {
    remitterId: `RMI-${y}-${pad6(st.remitter)}`,
    beneficiaryId: `BEN-EH-${y}-${pad6(st.beneficiary)}`,
    remittanceNo: `REM-${y}-${pad6(st.remittance)}`,
    moneyReceiptNo: `MRC-${y}-${pad6(st.receipt)}`,
  }
}
