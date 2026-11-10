/**
 * Centrale lijst van ontvangers + testmodus voor dagmail (ochtendbundel).
 *
 * Testmodus: env NOTIFICATIONS_TEST_MODE=true → alle dagmail naar TEST_USER.
 * Uit: management- en kantoorlijsten zoals hieronder.
 */

export const TEST_USER = "willem@bamalite.com"

const PROD_DAILY_EMAIL_MANAGEMENT = [
  "willem@bamalite.com",
  "leo@bamalite.com",
  "bart@bamalite.com",
] as const

const PROD_DAILY_EMAIL_OFFICE = [
  "karina@bamalite.com",
  "tanja@bamalite.com",
  "lucie@bamalite.com",
] as const

const PROD_BIRTHDAY_EMAIL = "nautic@bamalite.com"

export function isTestMode(): boolean {
  const value = (process.env.NOTIFICATIONS_TEST_MODE || "").toLowerCase().trim()
  return value === "true" || value === "1" || value === "yes"
}

export function getDailyEmailManagementRecipients(): string[] {
  if (isTestMode()) return [TEST_USER]
  return [...PROD_DAILY_EMAIL_MANAGEMENT]
}

export function getDailyEmailOfficeRecipients(): string[] {
  if (isTestMode()) return [TEST_USER]
  return [...PROD_DAILY_EMAIL_OFFICE]
}

/** Losse verjaardagsmail. In testmodus naar Willem, anders naar nautic. */
export function getBirthdayEmailRecipient(): string {
  if (isTestMode()) return TEST_USER
  return PROD_BIRTHDAY_EMAIL
}

const PROD_OUT_OF_SERVICE_EMAIL = ["willem@bamalite.com", "tanja@bamalite.com"] as const

/** Mail bij uit dienst. In testmodus alleen naar Willem. */
export function getOutOfServiceEmailRecipients(): string[] {
  if (isTestMode()) return [TEST_USER]
  return [...PROD_OUT_OF_SERVICE_EMAIL]
}
