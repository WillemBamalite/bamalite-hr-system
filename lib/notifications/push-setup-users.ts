const PUSH_SETUP_EMAILS = new Set(["willem@bamalite.com", "leo@bamalite.com"])

export function isPushSetupUser(email: string | null | undefined): boolean {
  const e = String(email || "")
    .trim()
    .toLowerCase()
  return PUSH_SETUP_EMAILS.has(e)
}
