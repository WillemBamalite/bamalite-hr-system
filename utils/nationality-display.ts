/** Toon nationaliteit als afkorting (geen vlag-emoji — die verschillen per OS). */
export function getNationalityFlag(nationality: string | null | undefined): string {
  const code = String(nationality || "").trim().toUpperCase()
  return code || "—"
}
