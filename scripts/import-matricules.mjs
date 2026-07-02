/**
 * Eenmalige import matricule nummers uit spreadsheet.
 * node scripts/import-matricules.mjs
 * Vereist: SUPABASE_SERVICE_ROLE_KEY in omgeving
 */
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "https://ocwraavhrtpvbqlkwnlb.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/** Volledige naam → matricule (uit gebruikers-spreadsheet) */
const MATRICULE_BY_NAME = {
  "Bart Bruinsma": "1986031967650",
  "Henri Bruinsma": "1978080273405",
  "Arie De Leeuw": "1970121711321",
  "Ed Eichhorn": "1969021669221",
  "Leo Godde": "1988081651147",
  "Leo Gödde": "1988081651147",
  "Tania Growen": "1969103116344",
  "Jop Handgraaf": "1974012155556",
  "Frank Hennekam": "1980122061752",
  "Marcel Hoogakker": "1963110576396",
  "Harald Jorgensen": "1969042261459",
  "Maurijn Klop": "1999010402124",
  "Hendrik Korsten": "1972062943915",
  "Jacob Leunis": "1980110211409",
  "Jos Meijer": "1960111855883",
  "Robert Pilar": "1972111001302",
  "Robert Pillar": "1972111001302",
  "Jaroslav Polak": "1983021151100",
  "Miroslav Polak": "1977032266346",
  "Radek Polak": "1978080155233",
  "Erik Span": "1988041533523",
  "Alexander Specht": "1976102105553",
  "Pierre Spronk": "1962102000244",
  "Floris Suiker": "1976070435303",
  "Jan Svoboda Sr.": "1966051969320",
  "Huib Ten Hacken": "1991080755575",
  "Willem Van der Bent": "1985022755143",
  "Melvin Van der Werf": "1983022735088",
  "Rob Van Etten": "1970122957909",
  "Theodorus Van Hasselt": "1996100300092",
  "Koert Van Veen": "1991040843732",
  "Richard Zegers": "1969082935362",
  "John Brito": "1969102700464",
  "Thijs Creemers": "1976010403340",
  "Jurena Dalibor": "1964033109032",
  "Waldemar Danazs": "1967011661484",
  "Waldemar Danajs": "1967011661484",
  "Mike De Boer": "1993030500257",
  "Michal Dudka": "1983062902171",
  "Slawomir Dziadosz": "1974100228295",
  "Laurent Eberling": "1988010603045",
  "Michael Fateev": "1989101671765",
  "Michael Fateen": "1989101671765",
  "Stanislaw Fus": "1979010202259",
  "Stanislaw Flis": "1979010202259",
  "Eddy Godde": "1992051806079",
  "Eddy Gödde": "1992051806079",
  "Ferry Groeneweg": "1970122483039",
  "Peter Gunter": "1973020331745",
  "Stefan Herdics": "1970072575241",
  "Stefan Hendriks": "1970072575241",
  "Leroy Hoogakker": "1997021363028",
  "Pavel Hypsa": "1974061711006",
  "Danny Jacobse": "1987020338217",
  "Milos Jurica": "1993012787725",
  "Milos Janca": "1993012787725",
  "Jessica Korsten": "1977040776475",
  "Jessica Karsten": "1977040776475",
  "Pavel Krejci": "1998081501123",
  "Pavel Kerya": "1998081501123",
  "Tomas Kucera": "1975012703048",
  "Roy Landsbergen": "1982101143445",
  "Cristaan Majcsak": "1971031501274",
  "Cristian Majovszki": "1971031501274",
  "Ladislav Mesarcik": "1978090884485",
  "Ladislav Mazanek": "1978090884485",
  "Vaclav Mlady": "1985122787612",
  "Ladislav Nemcek": "1967013183177",
  "Juraj Paal": "1988072977409",
  "Juraj Paul": "1988072977409",
  "David Paraska": "1972060400104",
  "Pavol Pastorek": "1986070973064",
  "Dejan Popovic": "1972091927785",
  "Michal Ptacek": "1999012102390",
  "Zsolt Radvansky": "1987051504258",
  "Daniel Rakosi": "1974080155119",
  "Joey Ramos": "1979122467667",
  "Joey Ramus": "1979122467667",
  "Yovanni Smith": "1995081700325",
  "Marian Sramek": "1983010969017",
  "Pavel Stary": "1974020101223",
  "Radim Statska": "1987021502775",
  "Radim Statske": "1987021502775",
  "Micky Stenczel": "1980110357209",
  "Mirko Stresovi": "1980110357209",
  "Jan Svoboda Jr.": "1996010435060",
  "Milan Szabo": "1964010328211",
  "Stefan Szabo": "1984092813556",
  "Roy Taelman": "1979103000493",
  "Roy Taciman": "1979103000493",
  "Jozef Tamas": "1970061018868",
  "Jan Tokar": "1984081259193",
  "Arvid Van Zon": "1981080602680",
  "Robin Vanicek": "1993060405103",
  "Gene Waan": "1984100471225",
  "Rene Vaan": "1984100471225",
  "Jan Wojnar": "1970031771715",
  "David Zbynek": "1977012909213",
  "Gina Bodrij": "2001073103246",
  "Casper De Ruiter": "2006101102373",
  "Peter Jakus": "1991012106643",
  "Roman Kesiar": "1987061606841",
  "Dominik Medulan": "1999092501029",
  "Jozef Nemcek": "1983041041792",
  "Jakub Misar": "1989071104939",
  "Jakub Mizar": "1989071104939",
  "Bouwdewijn De Looff": "1960111529115",
  "Boudewijn De Looff": "1960111529115",
  "Piet Noordzij": "1951051749307",
  "Henk Van Dokkum": "1972031246289",
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function fullName(m) {
  return `${String(m.first_name || "").trim()} ${String(m.last_name || "").trim()}`.trim()
}

function scoreMember(m) {
  const status = String(m.status || "")
  let s = 0
  if (status === "aan-boord") s += 100
  else if (status === "ziek") s += 80
  else if (status === "thuis") s += 60
  else if (status === "nog-in-te-delen") s += 20
  if (m.arbeidsovereenkomst === true) s += 50
  if (m.is_dummy === true) s -= 200
  if (String(m.id || "").startsWith("crew-")) s -= 10
  return s
}

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY ontbreekt")
    process.exit(1)
  }

  const { data: crew, error } = await supabase
    .from("crew")
    .select(
      "id, first_name, last_name, matricule, status, arbeidsovereenkomst, is_dummy"
    )
  if (error) throw error

  const byNormName = new Map()
  for (const m of crew || []) {
    const key = norm(fullName(m))
    if (!byNormName.has(key)) byNormName.set(key, [])
    byNormName.get(key).push(m)
  }

  const uniqueMatricules = new Map()
  for (const [name, mat] of Object.entries(MATRICULE_BY_NAME)) {
    const k = norm(name)
    if (!uniqueMatricules.has(k)) uniqueMatricules.set(k, mat)
  }

  const updated = []
  const skipped = []
  const notFound = []
  const ambiguous = []

  for (const [nameKey, matricule] of uniqueMatricules) {
    const matches = byNormName.get(nameKey) || []
    if (matches.length === 0) {
      notFound.push(nameKey)
      continue
    }

    const sorted = [...matches].sort((a, b) => scoreMember(b) - scoreMember(a))
    const best = sorted[0]

    if (matches.length > 1 && scoreMember(sorted[0]) === scoreMember(sorted[1])) {
      ambiguous.push({
        name: fullName(best),
        ids: matches.map((m) => m.id),
      })
    }

    const current = String(best.matricule || "").trim()
    if (current === matricule) {
      skipped.push(`${fullName(best)} (al correct)`)
      continue
    }

    const { error: updErr } = await supabase
      .from("crew")
      .update({ matricule })
      .eq("id", best.id)

    if (updErr) {
      console.error("FOUT", fullName(best), updErr.message)
      continue
    }

    updated.push({
      name: fullName(best),
      matricule,
      was: current || "(leeg)",
      id: best.id,
    })
  }

  console.log("\n=== BIJGEWERKT:", updated.length, "===\n")
  for (const u of updated) {
    console.log(`${u.name}: ${u.was} → ${u.matricule}`)
  }

  if (skipped.length) {
    console.log("\n=== OVERGESLAGEN (al goed):", skipped.length, "===\n")
    skipped.forEach((s) => console.log(s))
  }

  if (notFound.length) {
    console.log("\n=== NIET GEVONDEN IN DATABASE ===\n")
    notFound.forEach((n) => console.log("-", n))
  }

  if (ambiguous.length) {
    console.log("\n=== DUBBELE RECORDS (beste gekozen op status) ===\n")
    for (const a of ambiguous) {
      console.log(a.name, "→", a.ids.join(", "))
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
