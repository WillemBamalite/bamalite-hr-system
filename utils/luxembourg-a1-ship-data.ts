import { getShipParticularsConfigByName } from "@/app/schepen/overzicht/ship-particulars-registry"

export function getShipEni(shipName: string): string | null {
  const config = getShipParticularsConfigByName(shipName)
  if (!config) return null
  for (const section of config.sections) {
    for (const item of section.items || []) {
      if (String(item.label || "").toLowerCase().includes("eni nummer")) {
        const value = String(item.value || "").trim()
        return value || null
      }
    }
  }
  return null
}

/** ENI op formulier: 8 cijfers met voorloopnul. */
export function formatEniForA1Form(eni: string): string {
  const digits = String(eni || "").replace(/\D/g, "")
  if (!digits) return ""
  return digits.padStart(8, "0").slice(-8)
}

export function getShipOwner(shipName: string): string | null {
  const config = getShipParticularsConfigByName(shipName)
  if (!config) return null
  for (const section of config.sections) {
    for (const item of section.items || []) {
      if (String(item.label || "").toLowerCase() === "eigenaar") {
        return String(item.value || "").trim() || null
      }
    }
  }
  return null
}
