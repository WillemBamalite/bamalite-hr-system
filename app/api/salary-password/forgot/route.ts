import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { requireApiAccess } from "@/lib/api-security"
import {
  SALARY_PASSWORD_SCOPE_KEY,
  generateTempSalaryPassword,
  getBearerToken,
  getServiceRoleSupabaseClient,
  getUserFromBearerToken,
  hashSalaryPassword,
  newSalt,
} from "@/lib/salary-page-password"

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const token = getBearerToken(request)
    const user = await getUserFromBearerToken(token)
    if (!user) {
      return NextResponse.json({ success: false, error: "Geen gebruiker gevonden" }, { status: 401 })
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim()
    if (!resendApiKey) {
      return NextResponse.json(
        { success: false, error: "Mailconfig ontbreekt (RESEND_API_KEY)" },
        { status: 500 }
      )
    }

    const adminClient = getServiceRoleSupabaseClient()
    if (!adminClient) {
      return NextResponse.json({ success: false, error: "Server configuratie ontbreekt" }, { status: 500 })
    }

    const email = String(user.email || "").toLowerCase()
    if (!email) {
      return NextResponse.json({ success: false, error: "Geen e-mailadres op account" }, { status: 400 })
    }

    const tempPassword = generateTempSalaryPassword(10)
    const salt = newSalt()
    const hash = hashSalaryPassword(tempPassword, salt)

    const { error } = await adminClient.from("salary_page_passwords").upsert(
      [
        {
          user_id: user.id,
          user_email: email,
          month_key: SALARY_PASSWORD_SCOPE_KEY,
          password_hash: hash,
          password_salt: salt,
          must_change_password: true,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id,month_key" }
    )
    if (error) {
      const msg = String(error.message || "").toLowerCase()
      if (msg.includes("must_change_password")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Database mist kolom must_change_password. Voer scripts/add-salary-password-must-change.sql uit in Supabase.",
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "auth@bamalite-login.com"
    const subject = "Tijdelijk wachtwoord salarislijst"
    const text =
      `Je hebt een nieuw tijdelijk wachtwoord aangevraagd voor de salarislijst.\n\n` +
      `Tijdelijk wachtwoord: ${tempPassword}\n\n` +
      `Log in met dit wachtwoord. Daarna moet je direct een nieuw eigen wachtwoord instellen.\n\n` +
      `Als jij dit niet hebt aangevraagd, neem contact op met Leo of Willem.`

    const { error: sendError } = await resend.emails.send({
      from: `Bemanningslijst <${fromEmail}>`,
      to: [email],
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">Tijdelijk wachtwoord salarislijst</h2>
          <p>Je hebt een nieuw tijdelijk wachtwoord aangevraagd.</p>
          <p style="font-size: 18px; font-weight: bold; letter-spacing: 1px;">${tempPassword}</p>
          <p>Log in met dit wachtwoord. Daarna moet je <strong>direct een nieuw eigen wachtwoord</strong> instellen.</p>
          <p style="color: #6b7280; font-size: 13px;">Als jij dit niet hebt aangevraagd, neem contact op met Leo of Willem.</p>
        </div>
      `,
    })
    if (sendError) {
      return NextResponse.json(
        { success: false, error: sendError.message || "E-mail verzenden mislukt" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
