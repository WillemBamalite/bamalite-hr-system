export type SmeerlijstRow = {
  apparaat: string
  fabrikant: string
  type: string
  smeermiddel: string
}

const normalizeShipName = (name: string) =>
  String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

const VOLUNTAS_SMEERLIJST: SmeerlijstRow[] = [
  { apparaat: "Hoofdmotor", fabrikant: "Caterpillar", type: "3516 EUI", smeermiddel: "Mobilgard HSD 15W40" },
  { apparaat: "Keerkoppeling", fabrikant: "Masson", type: "RCD 1650", smeermiddel: "Mobil Delvac Legend 1330" },
  { apparaat: "Schroefaskoker", fabrikant: "IHC", type: "–", smeermiddel: "Mobil SHC Aware ST 100" },
  { apparaat: "Roeren", fabrikant: "Van Der Velden", type: "–", smeermiddel: "Mobilux EP 2" },
  { apparaat: "Generatorsets (2x)", fabrikant: "John Deere", type: "6068 Supertec met blower", smeermiddel: "Mobilgard HSD 15W40" },
  { apparaat: "Boegschroefinstallatie", fabrikant: "Verhaar-Omega", type: "–", smeermiddel: "Mobil Univis N 32" },
  { apparaat: "Boegschroefinstallatie", fabrikant: "Verhaar-Omega", type: "–", smeermiddel: "Mobilgear 600 XP 150" },
  { apparaat: "Boegschroefinstallatie", fabrikant: "Verhaar-Omega", type: "–", smeermiddel: "Mobilux EP 2" },
  { apparaat: "Boegschroefmotor", fabrikant: "Caterpillar", type: "3406", smeermiddel: "Mobilgard HSD 15W40" },
  { apparaat: "Speck Hydrofoor (2x)", fabrikant: "–", type: "–", smeermiddel: "Mobilgard HSD 15W40" },
  { apparaat: "Stuurinrichting", fabrikant: "Van Der Velden", type: "–", smeermiddel: "Mobil Univis N 32" },
  { apparaat: "Luchtcompressor", fabrikant: "Ingersoll Rand", type: "–", smeermiddel: "Ultra Coolant SSR" },
  { apparaat: "Ballastpomp", fabrikant: "Bornemann", type: "–", smeermiddel: "Mobilgear 600 XP 150" },
  { apparaat: "Afsluiters gasoliekraan", fabrikant: "–", type: "–", smeermiddel: "Mobil Univis N 32" },
  { apparaat: "Kolom stuurhut", fabrikant: "Kampus", type: "–", smeermiddel: "Mobil Univis N 32" },
  { apparaat: "Ankerlieren (2x)", fabrikant: "Menoram", type: "–", smeermiddel: "Mobilgear 600 XP 150" },
  { apparaat: "Ankerlieren (2x)", fabrikant: "Menoram", type: "–", smeermiddel: "Mobilux EP 2" },
  { apparaat: "Autokraan", fabrikant: "Van Wijk", type: "–", smeermiddel: "Mobil Univis N 32" },
  { apparaat: "Radarmast", fabrikant: "Beerens", type: "–", smeermiddel: "Mobil Univis N 32" },
  { apparaat: "Ladingpompen (9x)", fabrikant: "Marflex", type: "–", smeermiddel: "Mobil Univis N 32" },
]

const SMEERLIJST_BY_SHIP: Record<string, SmeerlijstRow[]> = {
  voluntas: VOLUNTAS_SMEERLIJST,
}

export function getShipSmeerlijstByName(shipName: string): SmeerlijstRow[] {
  return SMEERLIJST_BY_SHIP[normalizeShipName(shipName)] || []
}

export function shipHasSmeerlijst(shipName: string): boolean {
  return getShipSmeerlijstByName(shipName).length > 0
}
