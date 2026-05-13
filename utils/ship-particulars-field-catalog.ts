import { getShipParticularsConfigByName } from "@/app/schepen/overzicht/ship-particulars-registry"
import { getParticularFieldKey } from "@/utils/ship-particulars-overrides"

const HIDDEN = new Set(["Savealls bij tankontluchting", "Opvangranden machinegebied"])

/** Voorbeeldschepen om alle unieke velden uit de particulars-templates te verzamelen. */
const TEMPLATE_SHIP_NAMES = [
  "Apollo",
  "Jupiter",
  "Neptunus",
  "Bacchus",
  "Bellona",
  "Pluto",
  "Caritas",
  "Fraternite",
  "Libertas",
  "Maike",
  "Egalite",
  "Fidelitas",
  "Serenitas",
  "Harmonie",
  "Linde",
  "Primera",
  "Voluntas",
]

export type ParticularFieldOption = { id: string; section: string; label: string }

export function collectParticularFieldCatalog(): ParticularFieldOption[] {
  const seen = new Set<string>()
  const out: ParticularFieldOption[] = []
  for (const name of TEMPLATE_SHIP_NAMES) {
    const cfg = getShipParticularsConfigByName(name)
    if (!cfg) continue
    for (const section of cfg.sections) {
      for (const item of section.items ?? []) {
        if (HIDDEN.has(item.label)) continue
        const id = getParticularFieldKey(section.title, item.label)
        if (seen.has(id)) continue
        seen.add(id)
        out.push({ id, section: section.title, label: item.label })
      }
    }
  }
  out.sort((a, b) => {
    const c = a.section.localeCompare(b.section, "nl", { sensitivity: "base" })
    return c !== 0 ? c : a.label.localeCompare(b.label, "nl", { sensitivity: "base" })
  })
  return out
}
