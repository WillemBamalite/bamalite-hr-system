import { normalizeShipStorageName } from "@/utils/ship-certificates"

export type ShipParticularValueOverrides = Record<string, string>

export const getParticularFieldKey = (sectionTitle: string, label: string) => `${sectionTitle}::${label}`

export const getParticularOverridesStorageKey = (shipName: string) =>
  `${normalizeShipStorageName(shipName)}_particulars_value_overrides`

export const loadLocalParticularOverrides = (shipName: string): ShipParticularValueOverrides => {
  if (typeof window === "undefined") return {}
  const raw = window.localStorage.getItem(getParticularOverridesStorageKey(shipName))
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as ShipParticularValueOverrides) : {}
  } catch {
    return {}
  }
}
