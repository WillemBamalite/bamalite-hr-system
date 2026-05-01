/**
 * Centrale lijst van ontvangers + testmodus voor notificaties.
 *
 * Testmodus: zet env var NOTIFICATIONS_TEST_MODE=true.
 * In testmodus:
 *  - alle live push gaat naar TEST_USER (alleen die e-mail krijgt push)
 *  - alle e-mails gaan naar TEST_USER ipv echte groepen
 *
 * Schakelaar uit (NOTIFICATIONS_TEST_MODE=false of weg):
 *  - PUSH_RECIPIENTS = willem + leo
 *  - DAILY_EMAIL_MANAGEMENT = willem + leo + bart + jos
 *  - DAILY_EMAIL_OFFICE = karina + tanja + lucie
 */

export const TEST_USER = "willem@bamalite.com"

const PROD_PUSH_RECIPIENTS = [
  "willem@bamalite.com",
  "leo@bamalite.com",
] as const

const PROD_DAILY_EMAIL_MANAGEMENT = [
  "willem@bamalite.com",
  "leo@bamalite.com",
  "bart@bamalite.com",
  "jos@bamalite.com",
] as const

const PROD_DAILY_EMAIL_OFFICE = [
  "karina@bamalite.com",
  "tanja@bamalite.com",
  "lucie@bamalite.com",
] as const

export function isTestMode(): boolean {
  const value = (process.env.NOTIFICATIONS_TEST_MODE || "").toLowerCase().trim()
  return value === "true" || value === "1" || value === "yes"
}

export function getPushRecipients(): string[] {
  if (isTestMode()) return [TEST_USER]
  return [...PROD_PUSH_RECIPIENTS]
}

export function getDailyEmailManagementRecipients(): string[] {
  if (isTestMode()) return [TEST_USER]
  return [...PROD_DAILY_EMAIL_MANAGEMENT]
}

export function getDailyEmailOfficeRecipients(): string[] {
  if (isTestMode()) return [TEST_USER]
  return [...PROD_DAILY_EMAIL_OFFICE]
}
