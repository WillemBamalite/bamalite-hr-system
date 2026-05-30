/** Vaste id voor de sectie "Overig personeel" onderaan het schepenoverzicht. */
export const OVERIG_PERSONEEL_SHIP_ID = "overig"

export const OVERIG_PERSONEEL_LABEL = "Overig personeel"

export function isOverigPersoneelShipId(shipId: string | null | undefined): boolean {
  return shipId?.toString().toLowerCase().trim() === OVERIG_PERSONEEL_SHIP_ID
}

/** Waarde voor ship_id-select in formulieren. */
export function normalizeShipIdForSelect(shipId: string | null | undefined): string {
  if (!shipId || shipId === "") return "none"
  if (isOverigPersoneelShipId(shipId)) return OVERIG_PERSONEEL_SHIP_ID
  return shipId
}

export function resolveShipDisplayName(
  shipId: string | null | undefined,
  ships: Array<{ id: string; name: string }>
): string {
  if (!shipId || shipId === "none") return "Geen schip"
  if (isOverigPersoneelShipId(shipId)) return OVERIG_PERSONEEL_LABEL
  const ship = ships.find((s) => s.id === shipId)
  return ship?.name || "Geen schip"
}
