export type FirmaInvoiceDetails = {
  name: string
  street: string
  postalCity: string
  phone: string
  email: string
  invoiceEmail: string
  vatNumber: string
  tradeNumber: string
  bankAccount: string
}

/** Officiële factuurgegevens per firma (bron: Overzicht facturen Firma's.pdf). */
export const FIRMA_INVOICE_DETAILS: Record<string, FirmaInvoiceDetails> = {
  "Bamalite S.A.": {
    name: "Bamalite S.A.",
    street: "15A Duarrefstrooss",
    postalCity: "L-9990 Weiswampach",
    phone: "00352 2 707 5370",
    email: "info@bamalite.com",
    invoiceEmail: "facturen@bamalite.com",
    vatNumber: "LU 15955567",
    tradeNumber: "B 44356",
    bankAccount: "NL45 ABNA 0456 5656 55",
  },
  "Alcina S.A.": {
    name: "Alcina S.A.",
    street: "15A Duarrefstrooss",
    postalCity: "L-9990 Weiswampach",
    phone: "00352 2 707 5370",
    email: "info@alcina.lu",
    invoiceEmail: "facturen@alcina.lu",
    vatNumber: "LU 21887524",
    tradeNumber: "B 129072",
    bankAccount: "NL14 ABNA 0495 5327 62",
  },
  "Europe Shipping AG.": {
    name: "Europe Shipping A.G.",
    street: "15A Duarrefstrooss",
    postalCity: "L-9990 Weiswampach",
    phone: "00352 2 707 5370",
    email: "info@europeshipping.lu",
    invoiceEmail: "facturen@europeshipping.lu",
    vatNumber: "LU 18881647",
    tradeNumber: "B 83558",
    bankAccount: "NL36 ABNA 0404 2811 68",
  },
  "Brugo Shipping SARL.": {
    name: "Brugo Shipping S.A.R.L.",
    street: "15A Duarrefstrooss",
    postalCity: "L-9990 Weiswampach",
    phone: "00352 2 707 5370",
    email: "info@brugoshipping.lu",
    invoiceEmail: "facturen@brugoshipping.lu",
    vatNumber: "LU 35232058",
    tradeNumber: "B 277323",
    bankAccount: "NL58 ABNA 0128 8697 39",
  },
  "Devel Shipping S.A.": {
    name: "Devel Shipping S.A.",
    street: "15A Duarrefstrooss",
    postalCity: "L-9990 Weiswampach",
    phone: "00352 2 707 5370",
    email: "info@develshipping.lu",
    invoiceEmail: "facturen@develshipping.lu",
    vatNumber: "LU 22869958",
    tradeNumber: "B 139046",
    bankAccount: "NL80 ABNA 0128 6569 13",
  },
}

export function getFirmaInvoiceDetails(companyName: string): FirmaInvoiceDetails | null {
  const exact = FIRMA_INVOICE_DETAILS[companyName]
  if (exact) return exact
  const key = Object.keys(FIRMA_INVOICE_DETAILS).find(
    (k) => k.toLowerCase() === String(companyName || "").trim().toLowerCase()
  )
  return key ? FIRMA_INVOICE_DETAILS[key] : null
}

export function formatEuroInvoice(amount: number): string {
  // PDF Helvetica heeft geen € — gebruik EUR voor Acrobat-veilige tekst
  return `EUR ${amount.toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatMonthToken(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number)
  const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"]
  const label = months[(m || 1) - 1] || "JAN"
  return `${label} ${y}`
}
