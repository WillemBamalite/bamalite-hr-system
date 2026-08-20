import { shiftMonthKey } from "@/utils/doorbelasting"

export type DoorbelastingAmountsStore = {
  /** key: crewId|shipId|fromCompany|toCompany|monthKey -> amount */
  byMonth: Record<string, number>
  /** key: fromCompany|yyyyMM -> last sequence number used */
  invoiceSeq: Record<string, number>
  /** default BTW percentage */
  vatPercent: number
  updatedAt: string
}

const STORAGE_KEY = "doorbelasting_amounts_v1"

export function amountRowKey(
  crewId: string,
  shipId: string,
  fromCompany: string,
  toCompany: string,
  monthKey: string
) {
  return `${crewId}|${shipId}|${fromCompany}|${toCompany}|${monthKey}`
}

export function emptyAmountsStore(): DoorbelastingAmountsStore {
  return {
    byMonth: {},
    invoiceSeq: {},
    vatPercent: 12,
    updatedAt: new Date().toISOString(),
  }
}

export function loadDoorbelastingAmountsLocal(): DoorbelastingAmountsStore {
  if (typeof window === "undefined") return emptyAmountsStore()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyAmountsStore()
    const parsed = JSON.parse(raw)
    return {
      byMonth: parsed?.byMonth && typeof parsed.byMonth === "object" ? parsed.byMonth : {},
      invoiceSeq: parsed?.invoiceSeq && typeof parsed.invoiceSeq === "object" ? parsed.invoiceSeq : {},
      vatPercent: typeof parsed?.vatPercent === "number" ? parsed.vatPercent : 12,
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return emptyAmountsStore()
  }
}

export function saveDoorbelastingAmountsLocal(store: DoorbelastingAmountsStore) {
  if (typeof window === "undefined") return
  const next = { ...store, updatedAt: new Date().toISOString() }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

/**
 * Bedrag voor deze maand, of anders het meest recente eerdere bedrag
 * voor dezelfde persoon/route (blijft staan volgende maand).
 */
export function resolveDoorbelastingAmount(
  store: DoorbelastingAmountsStore,
  crewId: string,
  shipId: string,
  fromCompany: string,
  toCompany: string,
  monthKey: string
): number | null {
  const directKey = amountRowKey(crewId, shipId, fromCompany, toCompany, monthKey)
  const direct = store.byMonth[directKey]
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) return direct

  let cursor = shiftMonthKey(monthKey, -1)
  for (let i = 0; i < 36; i++) {
    const key = amountRowKey(crewId, shipId, fromCompany, toCompany, cursor)
    const value = store.byMonth[key]
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
    cursor = shiftMonthKey(cursor, -1)
  }
  return null
}

export function setDoorbelastingAmount(
  store: DoorbelastingAmountsStore,
  crewId: string,
  shipId: string,
  fromCompany: string,
  toCompany: string,
  monthKey: string,
  amount: number | null
): DoorbelastingAmountsStore {
  const key = amountRowKey(crewId, shipId, fromCompany, toCompany, monthKey)
  const byMonth = { ...store.byMonth }
  if (amount === null || !Number.isFinite(amount) || amount <= 0) {
    delete byMonth[key]
  } else {
    byMonth[key] = Math.round(amount * 100) / 100
  }
  return saveDoorbelastingAmountsLocal({ ...store, byMonth }) || { ...store, byMonth }
}

export function nextInvoiceNumber(
  store: DoorbelastingAmountsStore,
  fromCompany: string,
  monthKey: string
): { number: string; nextStore: DoorbelastingAmountsStore } {
  const yyyymm = monthKey.replace("-", "")
  const seqKey = `${fromCompany}|${yyyymm}`
  const current = Number(store.invoiceSeq[seqKey] || 0)
  const next = current + 1
  const number = `${yyyymm}${String(next).padStart(2, "0")}`
  const invoiceSeq = { ...store.invoiceSeq, [seqKey]: next }
  const nextStore = saveDoorbelastingAmountsLocal({ ...store, invoiceSeq }) || {
    ...store,
    invoiceSeq,
  }
  return { number, nextStore }
}
