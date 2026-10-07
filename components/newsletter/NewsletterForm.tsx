"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { figuresMonthLabel, type NewsletterEvents, type NewsletterPerson } from "@/utils/newsletter-events"
import { compressImageFile } from "@/utils/compress-image"
import {
  CHART_MONTHS,
  OPS_CATEGORIES,
  chartLinesFromMonths,
  chartMonthValues,
  newsletterUid,
  parseChartLines,
  SPOTLIGHT_PHOTO_LIMIT,
  type AgendaItem,
  type NewsletterContent,
  type OpsCategory,
  type OpsItem,
  type SpotlightContent,
  type WorkshopEntry,
} from "@/utils/newsletter-content"

type Props = {
  content: NewsletterContent
  setContent: Dispatch<SetStateAction<NewsletterContent>>
  crew: any[]
  ships: any[]
  events: NewsletterEvents
  month: Date
}

const inputClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
const areaClass = `${inputClass} min-h-[88px]`

function Section({ kicker, title, hint, children }: { kicker: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 border-b border-slate-100 pb-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9c7c45]">{kicker}</div>
        <h2 className="text-lg font-semibold text-[#10243f]">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

export function NewsletterForm({ content, setContent, crew, ships, events, month }: Props) {
  const [photoShip, setPhotoShip] = useState("")
  const [photoLocation, setPhotoLocation] = useState("")
  const [photoCaption, setPhotoCaption] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [imageError, setImageError] = useState("")

  const patch = (partial: Partial<NewsletterContent>) => setContent((current) => ({ ...current, ...partial }))
  const patchSpotlight = (partial: Partial<SpotlightContent>) =>
    setContent((current) => ({ ...current, spotlight: { ...current.spotlight, ...partial } }))

  const shipOptions = (ships || [])
    .map((ship) => ({ id: String(ship.id), name: String(ship.name || "").trim() }))
    .filter((ship) => ship.id && ship.name)
    .sort((a, b) => a.name.localeCompare(b.name, "nl"))

  const crewOptions = (crew || [])
    .filter((member) => {
      if (!member || member.is_dummy) return false
      const status = String(member.status || "").toLowerCase().trim()
      return status !== "uit-dienst" && status !== "uit dienst"
    })
    .map((member) => ({
      id: String(member.id),
      name: `${member.first_name || ""} ${member.last_name || ""}`.trim(),
      position: String(member.position || ""),
    }))
    .filter((member) => member.name)
    .sort((a, b) => a.name.localeCompare(b.name, "nl"))

  const addOps = (category: OpsCategory) => {
    const item: OpsItem = { id: newsletterUid("ops"), category, shipId: "", period: "", note: "" }
    patch({ opsItems: [...content.opsItems, item] })
  }

  const updateOps = (id: string, partial: Partial<OpsItem>) => {
    patch({
      opsItems: content.opsItems.map((item) => (item.id === id ? { ...item, ...partial } : item)),
    })
  }

  const addAgenda = () => {
    const item: AgendaItem = { id: newsletterUid("ag"), date: "", title: "", note: "", shipId: "" }
    patch({ agenda: [...content.agenda, item] })
  }

  const onPickImage = async (file: File | null, apply: (dataUrl: string) => void) => {
    if (!file) return
    setImageError("")
    try {
      const dataUrl = await compressImageFile(file)
      apply(dataUrl)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Kon foto niet toevoegen.")
    }
  }

  const addFleetPhoto = async (file: File | null) => {
    if (!file) return
    setPhotoError("")
    if (!photoShip.trim()) {
      setPhotoError("Kies eerst een schip voor de foto.")
      return
    }
    if (!photoCaption.trim()) {
      setPhotoError("Vul een bijschrift voor de foto in.")
      return
    }
    if (content.photos.length >= 8) {
      setPhotoError("Er passen maximaal 8 foto's in deze editie.")
      return
    }
    try {
      const dataUrl = await compressImageFile(file)
      patch({
        photos: [
          {
            id: newsletterUid("photo"),
            shipName: photoShip.trim(),
            location: photoLocation.trim(),
            caption: photoCaption.trim(),
            imageDataUrl: dataUrl,
          },
          ...content.photos,
        ].slice(0, 8),
      })
      setPhotoCaption("")
      setPhotoLocation("")
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Kon foto niet toevoegen.")
    }
  }

  const spotlightPhotos = content.spotlight.photos?.length
    ? content.spotlight.photos
    : content.spotlight.photoDataUrl
      ? [content.spotlight.photoDataUrl]
      : []

  const setSpotlightPhotos = (next: string[]) => {
    const photos = next.slice(0, SPOTLIGHT_PHOTO_LIMIT)
    patchSpotlight({ photos, photoDataUrl: photos[0] || "" })
  }

  const addWorkshop = (key: "workshopBirthdays" | "workshopJoining" | "workshopAnniversaries") => {
    const item: WorkshopEntry = { id: newsletterUid("ws"), name: "", role: "", date: "", years: "" }
    patch({ [key]: [...(content[key] || []), item] })
  }

  const updateWorkshop = (
    key: "workshopBirthdays" | "workshopJoining" | "workshopAnniversaries",
    id: string,
    partial: Partial<WorkshopEntry>,
  ) => {
    patch({
      [key]: (content[key] || []).map((item) => (item.id === id ? { ...item, ...partial } : item)),
    })
  }

  const removeWorkshop = (key: "workshopBirthdays" | "workshopJoining" | "workshopAnniversaries", id: string) => {
    patch({ [key]: (content[key] || []).filter((item) => item.id !== id) })
  }

  const hiddenPeople = new Set(content.hiddenPeople || [])
  const hidePerson = (id: string) => patch({ hiddenPeople: [...new Set([...(content.hiddenPeople || []), id])] })
  const showPerson = (id: string) => patch({ hiddenPeople: (content.hiddenPeople || []).filter((item) => item !== id) })

  const movePhoto = (index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= content.photos.length) return
    const photos = [...content.photos]
    const [item] = photos.splice(index, 1)
    photos.splice(next, 0, item)
    patch({ photos })
  }

  return (
    <div className="space-y-4">
      <Section
        kicker="Automatisch"
        title="Mensen deze maand"
        hint="Komt live uit de bemanningslijst. Weghalen geldt alleen voor deze editie, niet voor de bemanningslijst. Een leeg blok verdwijnt uit de krant."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PeopleColumn
            title="Welkom aan boord"
            empty="Geen indiensttredingen."
            people={events.joining}
            hidden={hiddenPeople}
            onHide={hidePerson}
            onShow={showPerson}
            render={(person) => (
              <>
                <div className="font-medium text-slate-900">{person.fullName}</div>
                <div className="text-sm text-slate-600">
                  {person.shipName ? `${person.shipName} • ` : ""}gestart {person.dateLabel}
                </div>
              </>
            )}
          />
          <PeopleColumn
            title="Verjaardagen"
            empty="Geen verjaardagen."
            people={events.birthdays}
            hidden={hiddenPeople}
            onHide={hidePerson}
            onShow={showPerson}
            render={(person) => (
              <div className="flex gap-3 text-sm">
                <span className="w-14 font-semibold text-[#10243f]">{person.dayLabel}</span>
                <span>{person.fullName}</span>
              </div>
            )}
          />
          <PeopleColumn
            title="Dienstjubilea"
            empty="Geen jubilea."
            people={events.anniversaries}
            hidden={hiddenPeople}
            onHide={hidePerson}
            onShow={showPerson}
            render={(person) => (
              <>
                <div className="font-medium text-slate-900">
                  {person.years} jaar — {person.fullName}
                </div>
                <div className="text-sm text-slate-600">
                  {person.dateLabel}
                  {person.shipName ? ` · ${person.shipName}` : ""}
                </div>
              </>
            )}
          />
        </div>
      </Section>

      <Section kicker="Opening" title="Maandboodschap" hint="Korte opening vanuit kantoor, direct onder de krantenkop.">
        <textarea
          value={content.intro}
          onChange={(event) => patch({ intro: event.target.value })}
          placeholder="Bijvoorbeeld een korte groet aan de vloot..."
          className={areaClass}
        />
      </Section>

      <Section
        kicker="Cijfers"
        title={figuresMonthLabel(month)}
        hint="De nieuwsbrief komt op de eerste uit. Dit zijn de cijfers van de maand ervoor, want van deze maand zijn ze er nog niet. Maximaal drie. Lege velden komen niet in de krant."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {content.kpis.map((kpi, index) => (
            <div key={kpi.id} className="space-y-2 rounded-md border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cijfer {index + 1}</div>
              <Field label="Waarde">
                <input
                  value={kpi.value}
                  onChange={(event) => {
                    const kpis = content.kpis.map((item) => (item.id === kpi.id ? { ...item, value: event.target.value } : item))
                    patch({ kpis })
                  }}
                  placeholder="18"
                  className={inputClass}
                />
              </Field>
              <Field label="Titel">
                <input
                  value={kpi.title}
                  onChange={(event) => {
                    const kpis = content.kpis.map((item) => (item.id === kpi.id ? { ...item, title: event.target.value } : item))
                    patch({ kpis })
                  }}
                  placeholder="Schepen in de vloot"
                  className={inputClass}
                />
              </Field>
              <Field label="Toelichting, optioneel">
                <input
                  value={kpi.note}
                  onChange={(event) => {
                    const kpis = content.kpis.map((item) => (item.id === kpi.id ? { ...item, note: event.target.value } : item))
                    patch({ kpis })
                  }}
                  className={inputClass}
                />
              </Field>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3 rounded-md border border-slate-200 p-3">
          <div className="font-medium text-[#10243f]">Grafiek</div>
          <p className="text-sm text-slate-500">De maanden staan klaar. Vul alleen een getal in bij de maanden die in de grafiek moeten. Leeg betekent: die maand niet tonen.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Titel">
              <input
                value={content.chart.title}
                onChange={(event) => patch({ chart: { ...content.chart, title: event.target.value } })}
                placeholder="Bijvoorbeeld: meldingen dit jaar"
                className={inputClass}
              />
            </Field>
            <Field label="Type">
              <select
                value={content.chart.type}
                onChange={(event) =>
                  patch({ chart: { ...content.chart, type: event.target.value === "line" ? "line" : "bar" } })
                }
                className={inputClass}
              >
                <option value="bar">Staaf</option>
                <option value="line">Lijn</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CHART_MONTHS.map((month) => {
              const values = chartMonthValues(content.chart.lines || "")
              return (
                <label key={month} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-sm text-slate-700">{month}</span>
                  <input
                    inputMode="decimal"
                    value={values[month]}
                    onChange={(event) => {
                      const next = { ...values, [month]: event.target.value }
                      const lines = chartLinesFromMonths(next)
                      patch({ chart: { ...content.chart, lines, points: parseChartLines(lines) } })
                    }}
                    placeholder="0"
                    className="w-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              )
            })}
          </div>
        </div>
      </Section>

      <Section kicker="Hoofdartikel" title="Schip of bemanningslid in de spotlight" hint="Niet ingevulde velden komen niet in de krant. Foto's komen onder elkaar naast de tekst.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Type">
            <select
              value={content.spotlight.type}
              onChange={(event) => patchSpotlight({ type: event.target.value === "ship" ? "ship" : "crew" })}
              className={inputClass}
            >
              <option value="crew">Bemanningslid</option>
              <option value="ship">Schip</option>
            </select>
          </Field>
          {content.spotlight.type === "crew" ? (
            <Field label="Bemanningslid">
              <select
                value={content.spotlight.crewId}
                onChange={(event) => {
                  const crewId = event.target.value
                  const member = crewOptions.find((item) => item.id === crewId)
                  patchSpotlight({ crewId, functie: member?.position || "" })
                }}
                className={inputClass}
              >
                <option value="">Kies bemanningslid...</option>
                {crewOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Schip">
              <select
                value={content.spotlight.shipId}
                onChange={(event) => patchSpotlight({ shipId: event.target.value })}
                className={inputClass}
              >
                <option value="">Kies schip...</option>
                {shipOptions.map((ship) => (
                  <option key={ship.id} value={ship.id}>
                    {ship.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <Field label={`Foto's, maximaal ${SPOTLIGHT_PHOTO_LIMIT}`}>
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              disabled={spotlightPhotos.length >= SPOTLIGHT_PHOTO_LIMIT}
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                void onPickImage(file, (photoDataUrl) => setSpotlightPhotos([...spotlightPhotos, photoDataUrl]))
                event.currentTarget.value = ""
              }}
            />
          </Field>
          {spotlightPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {spotlightPhotos.map((src, index) => (
                <div key={`${index}-${src.slice(0, 24)}`} className="rounded-md border border-slate-200 p-2">
                  <img src={src} alt="" className="h-28 w-full rounded bg-slate-100 object-contain" />
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <button type="button" className="text-[#10243f] disabled:opacity-40" disabled={index === 0} onClick={() => {
                      const next = [...spotlightPhotos]
                      const [item] = next.splice(index, 1)
                      next.splice(index - 1, 0, item)
                      setSpotlightPhotos(next)
                    }}>
                      Omhoog
                    </button>
                    <button type="button" className="text-[#10243f] disabled:opacity-40" disabled={index === spotlightPhotos.length - 1} onClick={() => {
                      const next = [...spotlightPhotos]
                      const [item] = next.splice(index, 1)
                      next.splice(index + 1, 0, item)
                      setSpotlightPhotos(next)
                    }}>
                      Omlaag
                    </button>
                    <button type="button" className="text-red-700" onClick={() => setSpotlightPhotos(spotlightPhotos.filter((_, photoIndex) => photoIndex !== index))}>
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <Field label="Korte introductie">
            <textarea
              value={content.spotlight.intro}
              onChange={(event) => patchSpotlight({ intro: event.target.value })}
              className={areaClass}
            />
          </Field>
          {content.spotlight.type === "crew" ? (
            <Field label="Functie">
              <input
                value={content.spotlight.functie}
                onChange={(event) => patchSpotlight({ functie: event.target.value })}
                className={inputClass}
              />
            </Field>
          ) : (
            <Field label="Wat maakt dit schip bijzonder?">
              <textarea
                value={content.spotlight.special}
                onChange={(event) => patchSpotlight({ special: event.target.value })}
                className={areaClass}
              />
            </Field>
          )}
          <Field label="Leuk weetje">
            <textarea
              value={content.spotlight.fact}
              onChange={(event) => patchSpotlight({ fact: event.target.value })}
              className={areaClass}
            />
          </Field>
          <Field label="Quote, optioneel">
            <textarea
              value={content.spotlight.quote}
              onChange={(event) => patchSpotlight({ quote: event.target.value })}
              className={areaClass}
            />
          </Field>
        </div>
      </Section>

      <Section kicker="Operatie" title="Operationeel deze maand" hint="Een categorie zonder items verschijnt niet in de krant.">
        <Field label="Korte operationele update">
          <textarea
            value={content.opsUpdate}
            onChange={(event) => patch({ opsUpdate: event.target.value })}
            placeholder="Vrije tekst. Alleen zichtbaar als dit veld is ingevuld."
            className={areaClass}
          />
        </Field>
        <div className="mt-4 space-y-4">
          {OPS_CATEGORIES.map((category) => {
            const items = content.opsItems.filter((item) => item.category === category.id)
            return (
              <div key={category.id} className="rounded-md border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-[#10243f]">{category.label}</div>
                    {category.hint ? <p className="text-sm text-slate-500">{category.hint}</p> : null}
                  </div>
                  <button type="button" className="text-sm font-medium text-[#10243f]" onClick={() => addOps(category.id)}>
                    + Item
                  </button>
                </div>
                {items.length === 0 ? <p className="text-sm text-slate-500">Nog niets. Dit blok blijft uit de krant.</p> : null}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 gap-2 rounded-md bg-slate-50 p-3 md:grid-cols-2">
                      {category.id === "vetting" ? null : (
                        <Field label="Schip">
                          <select
                            value={item.shipId}
                            onChange={(event) => updateOps(item.id, { shipId: event.target.value })}
                            className={inputClass}
                          >
                            <option value="">Kies schip...</option>
                            {shipOptions.map((ship) => (
                              <option key={ship.id} value={ship.id}>
                                {ship.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}
                      <Field label="Datum of periode, optioneel">
                        <input
                          value={item.period}
                          onChange={(event) => updateOps(item.id, { period: event.target.value })}
                          placeholder="12–18 oktober"
                          className={inputClass}
                        />
                      </Field>
                      <div className="md:col-span-2">
                        <Field label={category.id === "vetting" ? "Nieuwtje" : "Korte toelichting, optioneel"}>
                          <textarea
                            value={item.note}
                            onChange={(event) => updateOps(item.id, { note: event.target.value })}
                            placeholder={category.id === "vetting" ? "Wat is er te melden vanuit BFT?" : undefined}
                            className={areaClass}
                          />
                        </Field>
                      </div>
                      <button
                        type="button"
                        className="text-left text-sm text-red-700"
                        onClick={() => patch({ opsItems: content.opsItems.filter((row) => row.id !== item.id) })}
                      >
                        Item verwijderen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section kicker="Veiligheid" title="Veiligheidsmoment" hint="Alleen zichtbaar in de krant als je iets invult.">
        <div className="space-y-3">
          <Field label="Titel">
            <input
              value={content.safety.title}
              onChange={(event) => patch({ safety: { ...content.safety, title: event.target.value } })}
              placeholder="PBM's aan dek"
              className={inputClass}
            />
          </Field>
          <Field label="Korte tekst">
            <textarea
              value={content.safety.text}
              onChange={(event) => patch({ safety: { ...content.safety, text: event.target.value } })}
              className={areaClass}
            />
          </Field>
          <Field label="Foto, optioneel">
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                void onPickImage(file, (photoDataUrl) => patch({ safety: { ...content.safety, photoDataUrl } }))
                event.currentTarget.value = ""
              }}
            />
          </Field>
          {content.safety.photoDataUrl ? (
            <div>
              <img src={content.safety.photoDataUrl} alt="" className="h-32 rounded bg-slate-100 object-contain" />
              <button
                type="button"
                className="mt-1 text-xs text-red-700"
                onClick={() => patch({ safety: { ...content.safety, photoDataUrl: "" } })}
              >
                Foto verwijderen
              </button>
            </div>
          ) : null}
        </div>
      </Section>

      <Section kicker="Beelden" title="Foto's vanaf de schepen" hint="De bovenste foto wordt Foto van de maand. Maximaal 8.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Schip">
            <select value={photoShip} onChange={(event) => setPhotoShip(event.target.value)} className={inputClass}>
              <option value="">Kies schip...</option>
              {shipOptions.map((ship) => (
                <option key={ship.id} value={ship.name}>
                  {ship.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Locatie, optioneel">
            <input value={photoLocation} onChange={(event) => setPhotoLocation(event.target.value)} placeholder="Duisburg" className={inputClass} />
          </Field>
          <Field label="Bijschrift">
            <input
              value={photoCaption}
              onChange={(event) => setPhotoCaption(event.target.value)}
              placeholder="Zonsopkomst onderweg naar ..."
              className={inputClass}
            />
          </Field>
        </div>
        <input
          type="file"
          accept="image/*"
          className="mt-3 text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0] || null
            void addFleetPhoto(file)
            event.currentTarget.value = ""
          }}
        />
        {photoError ? <p className="mt-2 text-sm text-red-700">{photoError}</p> : null}
        {content.photos.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {content.photos.map((photo, index) => (
              <div key={photo.id} className="rounded-md border border-slate-200 p-2">
                <img src={photo.imageDataUrl} alt="" className="h-36 w-full rounded bg-slate-100 object-contain" />
                <div className="mt-2 text-sm font-medium text-slate-900">
                  {index === 0 ? "Foto van de maand · " : ""}
                  {photo.shipName}
                  {photo.location ? ` • ${photo.location}` : ""}
                </div>
                <div className="text-sm text-slate-600">{photo.caption}</div>
                <div className="mt-2 flex gap-3 text-xs">
                  <button type="button" className="text-[#10243f]" onClick={() => movePhoto(index, -1)} disabled={index === 0}>
                    Omhoog
                  </button>
                  <button
                    type="button"
                    className="text-[#10243f]"
                    onClick={() => movePhoto(index, 1)}
                    disabled={index === content.photos.length - 1}
                  >
                    Omlaag
                  </button>
                  <button
                    type="button"
                    className="text-red-700"
                    onClick={() => patch({ photos: content.photos.filter((item) => item.id !== photo.id) })}
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Section>

      <Section
        kicker="Werkplaats"
        title="Nieuws vanuit de werkplaats"
        hint="Zelf invullen, dit komt niet uit de bemanningslijst. Een leeg blok verdwijnt uit de krant."
      >
        <img src="/am-bruinsma-logo.png.png" alt="AM Bruinsma" className="mb-4 h-14 w-auto object-contain" />
        <div className="space-y-4">
          <WorkshopList
            title="Verjaardagen"
            addLabel="+ Verjaardag"
            items={content.workshopBirthdays || []}
            onAdd={() => addWorkshop("workshopBirthdays")}
            onChange={(id, partial) => updateWorkshop("workshopBirthdays", id, partial)}
            onRemove={(id) => removeWorkshop("workshopBirthdays", id)}
            fields={[
              { key: "name", label: "Naam", placeholder: "Stefan Hooimeijer" },
              { key: "date", label: "Jarig op", type: "date" },
            ]}
          />
          <WorkshopList
            title="Nieuw in dienst"
            addLabel="+ Medewerker"
            items={content.workshopJoining || []}
            onAdd={() => addWorkshop("workshopJoining")}
            onChange={(id, partial) => updateWorkshop("workshopJoining", id, partial)}
            onRemove={(id) => removeWorkshop("workshopJoining", id)}
            fields={[
              { key: "name", label: "Naam", placeholder: "Brian de Boer" },
              { key: "role", label: "Functie", placeholder: "Mechanisch monteur" },
              { key: "date", label: "In dienst vanaf", type: "date" },
            ]}
          />
          <WorkshopList
            title="Dienstjubilea"
            addLabel="+ Jubileum"
            items={content.workshopAnniversaries || []}
            onAdd={() => addWorkshop("workshopAnniversaries")}
            onChange={(id, partial) => updateWorkshop("workshopAnniversaries", id, partial)}
            onRemove={(id) => removeWorkshop("workshopAnniversaries", id)}
            fields={[
              { key: "name", label: "Naam", placeholder: "Naam" },
              { key: "years", label: "Aantal jaar", placeholder: "10" },
              { key: "role", label: "Functie, optioneel", placeholder: "Elektricien" },
              { key: "date", label: "Datum", type: "date" },
            ]}
          />
          <Field label="Nieuwtjes">
            <textarea
              value={content.workshopNews || ""}
              onChange={(event) => patch({ workshopNews: event.target.value })}
              placeholder="Vrij nieuws vanuit de werkplaats."
              className={areaClass}
            />
          </Field>
        </div>
      </Section>

      <Section kicker="Vooruitblik" title="Wat komt eraan?">
        <div className="space-y-3">
          {content.agenda.map((item) => (
            <div key={item.id} className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-2">
              <Field label="Datum">
                <input
                  type="date"
                  value={item.date}
                  onChange={(event) =>
                    patch({ agenda: content.agenda.map((row) => (row.id === item.id ? { ...row, date: event.target.value } : row)) })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Titel">
                <input
                  value={item.title}
                  onChange={(event) =>
                    patch({ agenda: content.agenda.map((row) => (row.id === item.id ? { ...row, title: event.target.value } : row)) })
                  }
                  placeholder="BIQ-inspectie"
                  className={inputClass}
                />
              </Field>
              <Field label="Schip, optioneel">
                <select
                  value={item.shipId}
                  onChange={(event) =>
                    patch({ agenda: content.agenda.map((row) => (row.id === item.id ? { ...row, shipId: event.target.value } : row)) })
                  }
                  className={inputClass}
                >
                  <option value="">Geen schip</option>
                  {shipOptions.map((ship) => (
                    <option key={ship.id} value={ship.id}>
                      {ship.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Korte toelichting">
                <input
                  value={item.note}
                  onChange={(event) =>
                    patch({ agenda: content.agenda.map((row) => (row.id === item.id ? { ...row, note: event.target.value } : row)) })
                  }
                  className={inputClass}
                />
              </Field>
              <button
                type="button"
                className="text-left text-sm text-red-700"
                onClick={() => patch({ agenda: content.agenda.filter((row) => row.id !== item.id) })}
              >
                Item verwijderen
              </button>
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-[#10243f]" onClick={addAgenda}>
            + Agendapunt
          </button>
        </div>
      </Section>

      <Section kicker="Afsluiting" title="Bericht van kantoor" hint="Extra updates en de afsluiting komen samen in de krant. De afsluiting wordt cursief.">
        <div className="space-y-3">
          <Field label="Extra updates">
            <textarea
              value={content.officeUpdates}
              onChange={(event) => patch({ officeUpdates: event.target.value })}
              className={`${areaClass} min-h-[120px]`}
            />
          </Field>
          <Field label="Afsluiting">
            <textarea
              value={content.officeClosing}
              onChange={(event) => patch({ officeClosing: event.target.value })}
              placeholder="Dankwoord of vooruitblik naar volgende maand."
              className={areaClass}
            />
          </Field>
        </div>
      </Section>
      {imageError ? <p className="text-sm text-red-700">{imageError}</p> : null}
    </div>
  )
}

function WorkshopList({
  title,
  addLabel,
  items,
  fields,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string
  addLabel: string
  items: WorkshopEntry[]
  fields: { key: "name" | "role" | "date" | "years"; label: string; placeholder?: string; type?: "date" }[]
  onAdd: () => void
  onChange: (id: string, partial: Partial<WorkshopEntry>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="font-medium text-[#10243f]">{title}</div>
        <button type="button" className="text-sm font-medium text-[#10243f]" onClick={onAdd}>
          {addLabel}
        </button>
      </div>
      {items.length === 0 ? <p className="text-sm text-slate-500">Nog niets. Dit blok blijft uit de krant.</p> : null}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-1 gap-2 rounded-md bg-slate-50 p-3 md:grid-cols-2">
            {fields.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  type={field.type || "text"}
                  value={item[field.key]}
                  placeholder={field.placeholder}
                  onChange={(event) => onChange(item.id, { [field.key]: event.target.value })}
                  className={inputClass}
                />
              </Field>
            ))}
            <button type="button" className="text-left text-sm text-red-700" onClick={() => onRemove(item.id)}>
              Item verwijderen
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PeopleColumn({
  title,
  empty,
  people,
  hidden,
  onHide,
  onShow,
  render,
}: {
  title: string
  empty: string
  people: NewsletterPerson[]
  hidden: Set<string>
  onHide: (id: string) => void
  onShow: (id: string) => void
  render: (person: NewsletterPerson) => React.ReactNode
}) {
  const visible = people.filter((person) => !hidden.has(person.id))
  const concealed = people.filter((person) => hidden.has(person.id))
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#9c7c45]">{title}</div>
      {visible.length > 0 ? (
        <div className="space-y-1.5">
          {visible.map((person) => (
            <div key={person.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">{render(person)}</div>
              <button type="button" className="shrink-0 text-xs text-red-700" onClick={() => onHide(person.id)}>
                Weghalen
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{empty} Komt niet in de krant.</p>
      )}
      {concealed.length > 0 ? (
        <div className="mt-2 space-y-1">
          {concealed.map((person) => (
            <div key={person.id} className="flex items-center justify-between gap-3 text-sm text-slate-400">
              <span className="line-through">{person.fullName}</span>
              <button type="button" className="shrink-0 text-xs text-[#10243f]" onClick={() => onShow(person.id)}>
                Terugzetten
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
