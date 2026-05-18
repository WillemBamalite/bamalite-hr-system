export const SHIP_FORMS_STORAGE_BUCKET = "official-warnings"

export const normalizeShipStorageSegment = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export const sanitizeShipFormFileName = (value: string) =>
  String(value || "").replace(/[^a-zA-Z0-9._-]/g, "_")

export const buildShipFormStoragePath = (shipName: string, formKey: string, fileName: string) => {
  const safeShip = normalizeShipStorageSegment(shipName) || "onbekend-schip"
  const safeForm = normalizeShipStorageSegment(formKey) || "formulier"
  const safeFile = sanitizeShipFormFileName(fileName) || "bestand"
  return `ship-forms/${safeShip}/${safeForm}/${Date.now()}-${safeFile}`
}
