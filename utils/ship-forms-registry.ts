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
