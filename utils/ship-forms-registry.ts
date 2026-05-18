export type ShipFormDefinition = {
  key: string
  label: string
}

/** Vaste lijst scheepsformulieren (volgorde zoals opgegeven). */
export const SHIP_FORM_DEFINITIONS: ShipFormDefinition[] = [
  { key: "stuwplan", label: "Stuwplan" },
  { key: "reisvoorbereiding", label: "Reisvoorbereiding" },
  { key: "ladingjournaal", label: "Ladingjournaal" },
  { key: "alcohol-en-drugstesten", label: "Alcohol en Drugstesten" },
  { key: "bunkerformulier", label: "Bunkerformulier" },
  { key: "werkvergunning", label: "Werkvergunning" },
  { key: "maandelijkse-testen-en-controles", label: "Maandelijkse Testen en Controles" },
  { key: "temperatuur-en-tankhoogtes", label: "Temperatuur en Tankhoogtes" },
  { key: "meting-besloten-ruimtes", label: "Meting Besloten Ruimtes" },
  { key: "meten-na-ontgassen-ventileren", label: "Meten na Ontgassen/Ventileren" },
  { key: "jaarlijkse-controle-stuurhuis", label: "Jaarlijkse Controle Stuurhuis" },
  { key: "jaarlijkse-controle-autokraan", label: "Jaarlijkse Controle Autokraan" },
  { key: "slobtank-registratie", label: "Slobtank Registratie" },
  { key: "management-of-change", label: "Management of Change" },
  { key: "wachtoverdracht", label: "Wachtoverdracht" },
  { key: "bezoekersformulier", label: "Bezoekersformulier" },
  { key: "jaarlijkse-stabiliteitstest", label: "Jaarlijkse Stabiliteitstest" },
  { key: "familiarisatie", label: "Familiarisatie" },
  { key: "kwartaal-training-walkapitein", label: "Kwartaal Training Walkapitein" },
  { key: "evaluatie-bemanningslid", label: "Evaluatie Bemanningslid" },
  { key: "alcohol-en-drugsverklaring", label: "Alcohol en Drugsverklaring" },
  { key: "verklaring-veiligheidsvoorschriften", label: "Verklaring Veiligheidsvoorschriften" },
  { key: "verklaring-zwemvesten", label: "Verklaring Zwemvesten" },
  { key: "operationele-training", label: "Operationele Training" },
  { key: "brandtraining", label: "Brandtraining" },
  { key: "veiligheidstraining", label: "Veiligheidstraining" },
  { key: "safety-meeting", label: "Safety Meeting" },
  { key: "purge-rapport", label: "Purge Rapport" },
]

export const SHIP_FORM_KEYS = new Set(SHIP_FORM_DEFINITIONS.map((f) => f.key))

export type ShipFormLayoutState = {
  custom_forms: ShipFormDefinition[]
  removed_form_keys: string[]
}

export const createEmptyShipFormLayout = (): ShipFormLayoutState => ({
  custom_forms: [],
  removed_form_keys: [],
})

export const slugifyShipFormLabel = (label: string) => {
  const slug = String(label || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || `formulier-${Date.now()}`
}

export const buildVisibleShipForms = (layout: ShipFormLayoutState): ShipFormDefinition[] => {
  const removed = new Set(layout.removed_form_keys.map((k) => String(k || "").trim()).filter(Boolean))
  const defaults = SHIP_FORM_DEFINITIONS.filter((f) => !removed.has(f.key))
  const defaultKeys = new Set(defaults.map((f) => f.key))
  const custom = (layout.custom_forms || []).filter(
    (f) => f.key && f.label && !removed.has(f.key) && !defaultKeys.has(f.key)
  )
  return [...defaults, ...custom]
}

export const isDefaultShipFormKey = (formKey: string) => SHIP_FORM_KEYS.has(formKey)
